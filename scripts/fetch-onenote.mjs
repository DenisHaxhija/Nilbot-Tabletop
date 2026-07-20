// Pulls your OneNote notebooks down to local files via Microsoft Graph.
//
// Auth: OAuth device-code flow, READ-ONLY scope (Notes.Read). Tokens are kept
// in memory only — nothing is written to disk except your notes and images.
// Revoke anytime at https://account.live.com/consent/Manage
//
//   node scripts/fetch-onenote.mjs
//
// Output: data/onenote-export/<Notebook>/<Section...>/<NNN Title>.html
//         with an assets/ folder of downloaded images per section.
import fs from 'node:fs';
import path from 'node:path';

const CLIENT_ID = '14d82eec-204b-4c2f-b7e8-296a70dab67e'; // Microsoft Graph public client
const SCOPE = 'Notes.Read offline_access';
const OUT = path.resolve('data', 'onenote-export');
const GRAPH = 'https://graph.microsoft.com/v1.0';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// --- 1. Device-code login -----------------------------------------------------
async function login() {
	// Keeps requesting fresh device codes until the user completes sign-in, so
	// there is always a valid code waiting whenever they get to it.
	while (true) {
		const dcRes = await fetch('https://login.microsoftonline.com/common/oauth2/v2.0/devicecode', {
			method: 'POST',
			headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
			body: new URLSearchParams({ client_id: CLIENT_ID, scope: SCOPE })
		});
		const dc = await dcRes.json();
		if (!dc.device_code) throw new Error(`Device code request failed: ${JSON.stringify(dc)}`);

		console.log('='.repeat(60));
		console.log(`LOGIN REQUIRED  (${new Date().toLocaleTimeString()})`);
		console.log(`1. Open:  ${dc.verification_uri}`);
		console.log(`2. Enter code:  ${dc.user_code}`);
		console.log('3. Sign in and ACCEPT the consent screen.');
		console.log(`(code valid ~${Math.round(dc.expires_in / 60)} min — a fresh one auto-appears if it expires)`);
		console.log('='.repeat(60));
		fs.writeFileSync('/tmp/onenote-login-code.txt', `${dc.verification_uri}\n${dc.user_code}\n`);

		let expired = false;
		while (!expired) {
			await sleep((dc.interval ?? 5) * 1000);
			const res = await fetch('https://login.microsoftonline.com/common/oauth2/v2.0/token', {
				method: 'POST',
				headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
				body: new URLSearchParams({
					grant_type: 'urn:ietf:params:oauth:grant-type:device_code',
					client_id: CLIENT_ID,
					device_code: dc.device_code
				})
			});
			const tok = await res.json();
			if (tok.access_token) return tok;
			if (tok.error === 'authorization_pending') continue;
			if (tok.error === 'slow_down') {
				await sleep(5000);
				continue;
			}
			if (tok.error === 'expired_token') {
				console.log('Code expired — requesting a fresh one…');
				expired = true;
				continue;
			}
			throw new Error(`Login failed: ${tok.error} ${tok.error_description ?? ''}`);
		}
	}
}

let tokens = await login();
console.log('\nLogged in. Fetching notebooks…');

async function graphFetch(url, asBuffer = false) {
	for (let attempt = 0; attempt < 4; attempt++) {
		const res = await fetch(url, {
			headers: { Authorization: `Bearer ${tokens.access_token}` }
		});
		if (res.status === 401 && tokens.refresh_token) {
			const rr = await fetch('https://login.microsoftonline.com/common/oauth2/v2.0/token', {
				method: 'POST',
				headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
				body: new URLSearchParams({
					grant_type: 'refresh_token',
					client_id: CLIENT_ID,
					refresh_token: tokens.refresh_token,
					scope: SCOPE
				})
			});
			const nt = await rr.json();
			if (nt.access_token) {
				tokens = nt;
				continue;
			}
		}
		if (res.status === 429) {
			const wait = Number(res.headers.get('retry-after') ?? 5) * 1000;
			await sleep(wait);
			continue;
		}
		if (!res.ok) throw new Error(`${res.status} ${url}`);
		return asBuffer ? Buffer.from(await res.arrayBuffer()) : res;
	}
	throw new Error(`Giving up on ${url}`);
}

async function graphJson(url) {
	const res = await graphFetch(url);
	return res.json();
}

async function listAll(url) {
	const items = [];
	let next = url;
	while (next) {
		const page = await graphJson(next);
		items.push(...(page.value ?? []));
		next = page['@odata.nextLink'] ?? null;
	}
	return items;
}

const safe = (s) =>
	(s ?? 'untitled').replace(/[\\/:*?"<>|]/g, '-').replace(/\s+/g, ' ').trim().slice(0, 120) ||
	'untitled';

// --- 2. Walk the notebook tree ------------------------------------------------
// The flat sections endpoint carries parent notebook + section group names.
const sections = await listAll(
	`${GRAPH}/me/onenote/sections?$top=100&$expand=parentNotebook,parentSectionGroup`
);
console.log(`Found ${sections.length} sections.`);

const manifest = [];
const EXT_BY_MIME = {
	'image/png': '.png',
	'image/jpeg': '.jpg',
	'image/gif': '.gif',
	'image/webp': '.webp',
	'image/bmp': '.bmp',
	'image/tiff': '.tif'
};

let pageCount = 0;
let imgCount = 0;

for (const sec of sections) {
	const parts = [safe(sec.parentNotebook?.displayName ?? 'Notebook')];
	if (sec.parentSectionGroup?.displayName) parts.push(safe(sec.parentSectionGroup.displayName));
	parts.push(safe(sec.displayName));
	const dir = path.join(OUT, ...parts);
	const assetsDir = path.join(dir, 'assets');
	fs.mkdirSync(dir, { recursive: true });

	const pages = await listAll(
		`${GRAPH}/me/onenote/sections/${sec.id}/pages?$top=100&$select=id,title,createdDateTime,order`
	);
	console.log(`${parts.join(' / ')} — ${pages.length} pages`);

	for (const [i, p] of pages.entries()) {
		try {
			const contentRes = await graphFetch(`${GRAPH}/me/onenote/pages/${p.id}/content`);
			let html = await contentRes.text();

			// Download embedded images (src + data-fullres-src point at Graph
			// resource URLs that need auth) and rewrite to local files.
			const resourceUrls = [
				...new Set(
					[...html.matchAll(/https:\/\/graph\.microsoft\.com\/v1\.0\/[^"' ]*resources\/[^"' ]+\/\$value/g)].map(
						(m) => m[0]
					)
				)
			];
			for (const url of resourceUrls) {
				try {
					const res = await graphFetch(url);
					const mime = res.headers.get('content-type')?.split(';')[0] ?? '';
					const buf = Buffer.from(await res.arrayBuffer());
					const rid = url.match(/resources\/([^/]+)\//)?.[1] ?? `res${imgCount}`;
					const ext = EXT_BY_MIME[mime] ?? '.bin';
					fs.mkdirSync(assetsDir, { recursive: true });
					const fname = `${safe(rid)}${ext}`;
					fs.writeFileSync(path.join(assetsDir, fname), buf);
					html = html.replaceAll(url, `assets/${fname}`);
					imgCount++;
					await sleep(120);
				} catch (e) {
					console.log(`    image failed (${e.message}) — leaving remote URL`);
				}
			}

			const fname = `${String(i + 1).padStart(3, '0')} ${safe(p.title || 'untitled')}.html`;
			fs.writeFileSync(path.join(dir, fname), html);
			manifest.push({
				notebook: sec.parentNotebook?.displayName ?? null,
				sectionGroup: sec.parentSectionGroup?.displayName ?? null,
				section: sec.displayName,
				title: p.title,
				file: path.join(...parts, fname),
				created: p.createdDateTime
			});
			pageCount++;
			await sleep(200);
		} catch (e) {
			console.log(`  page failed: ${p.title} (${e.message})`);
		}
	}
}

fs.writeFileSync(path.join(OUT, 'manifest.json'), JSON.stringify(manifest, null, 2));
console.log(`\nDONE. ${pageCount} pages, ${imgCount} images → ${OUT}`);
console.log('Access token was kept in memory only. Revoke: https://account.live.com/consent/Manage');
