// Imports the free battle-map library from Dice Grimorium (dicegrimorium.com)
// into the NilBot map library. Their free maps are published for personal
// home-game use — do NOT redistribute these files with the app.
//
//   node scripts/import-dicegrimorium.mjs [--user <name>]
import Database from 'better-sqlite3';
import fs from 'node:fs';
import path from 'node:path';
import { inferTags, resolveImportUser } from './lib.mjs';

const UA = 'Mozilla/5.0 (X11; Linux x86_64) NilBot-personal-map-importer';
const API = 'https://dicegrimorium.com/wp-json/wp/v2/posts';
const MAPS_DIR = path.resolve('data', 'maps');
const DELAY_MS = 300;

const db = new Database(path.join('data', 'nilbot.db'));
db.pragma('journal_mode = WAL');
try {
	db.exec(`ALTER TABLE maps ADD COLUMN src TEXT`);
} catch { /* exists */ }
try {
	db.exec(`ALTER TABLE maps ADD COLUMN user_id INTEGER`);
} catch { /* exists */ }
try {
	db.exec(`ALTER TABLE maps ADD COLUMN tags TEXT NOT NULL DEFAULT ''`);
} catch { /* exists */ }
fs.mkdirSync(MAPS_DIR, { recursive: true });

// Collections are SHARED (user_id NULL) by default — one copy for all DMs.
// Pass --user <name> only to import into a personal layer instead.
const importUserId = process.argv.includes('--user') ? resolveImportUser(db, process.argv) : null;
const existing = new Set(
	db.prepare('SELECT src FROM maps WHERE src IS NOT NULL').all().map((r) => r.src)
);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const decode = (s) =>
	s.replace(/&#0?38;|&amp;/g, '&').replace(/&#8217;/g, "'").replace(/&#8211;/g, '–');

const insert = db.prepare(
	`INSERT INTO maps (name, file, src, tags, user_id) VALUES (?, 'pending', ?, ?, ${importUserId ?? 'NULL'})`
);
const setFile = db.prepare(`UPDATE maps SET file = ? WHERE id = ?`);

let imported = 0;
let skipped = 0;
let failed = 0;

for (let page = 1; ; page++) {
	const res = await fetch(
		`${API}?per_page=100&page=${page}&_fields=slug,link,title,content`,
		{ headers: { 'User-Agent': UA } }
	);
	if (!res.ok) break;
	const posts = await res.json();
	if (!Array.isArray(posts) || posts.length === 0) break;
	const totalPages = Number(res.headers.get('x-wp-totalpages') || 1);
	console.log(`Page ${page}/${totalPages} — ${posts.length} posts`);

	for (const p of posts) {
		if (existing.has(p.link)) {
			skipped++;
			continue;
		}
		try {
			const content = p.content?.rendered ?? '';
			const imgs = [...content.matchAll(/https:\/\/dicegrimorium\.com\/wp-content\/uploads\/[^\s"']+\.(?:jpg|jpeg|png|webp)/g)]
				.map((m) => m[0])
				.filter((u) => !/logo|banner|patreon|icon|avatar/i.test(u));
			if (imgs.length === 0) {
				failed++;
				continue;
			}
			// Prefer the map file itself; upgrade sized variants to the full "-scaled" upload.
			const first = imgs.find((u) => /map/i.test(u)) ?? imgs[0];
			const base = first.replace(/-\d+x\d+(\.\w+)$/, '$1');
			const scaled = base.replace(/(\.\w+)$/, '-scaled$1');

			let buf = null;
			for (const candidate of [scaled, base, first]) {
				const r = await fetch(candidate, { headers: { 'User-Agent': UA } });
				if (r.ok) {
					buf = Buffer.from(await r.arrayBuffer());
					if (buf.length > 30_000) break;
					buf = null;
				}
			}
			if (!buf) {
				failed++;
				continue;
			}

			const title = decode(p.title?.rendered ?? p.slug).replace(/\s*[-–|]\s*d&?d.*$/i, '');
			const grid = path.basename(first).match(/(\d{1,2}x\d{1,3})/)?.[1];
			const name = `${title}${grid ? ` (${grid})` : ''} — DG`;
			const ext = path.extname(new URL(base).pathname).toLowerCase() || '.jpg';

			const info = insert.run(name, p.link, inferTags(title));
			const filename = `${info.lastInsertRowid}${ext}`;
			fs.writeFileSync(path.join(MAPS_DIR, filename), buf);
			setFile.run(filename, info.lastInsertRowid);
			imported++;
			if (imported % 25 === 0) console.log(`  ${imported} imported…`);
		} catch (e) {
			failed++;
			console.log(`  failed: ${p.slug} (${e.message})`);
		}
		await sleep(DELAY_MS);
	}
	if (page >= totalPages) break;
}

console.log(`\nDone. Imported ${imported}, skipped ${skipped} (already present), failed ${failed}.`);
console.log(`Total maps in library: ${db.prepare('SELECT count(*) c FROM maps').get().c}`);
console.log('\nMaps by Dice Grimorium (https://dicegrimorium.com) — free for personal home games.');
