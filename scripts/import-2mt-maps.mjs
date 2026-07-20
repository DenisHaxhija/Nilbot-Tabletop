// Imports the free battle-map collection from 2-Minute Tabletop into the
// NilBot map library (data/maps + the maps table).
//
// License: 2-Minute Tabletop releases its content under CC BY-NC 4.0
// (https://2minutetabletop.com/faq/license-and-attribution/). Personal,
// non-commercial use with attribution. Do NOT redistribute these files
// with the app.
//
//   node scripts/import-2mt-maps.mjs
import Database from 'better-sqlite3';
import fs from 'node:fs';
import path from 'node:path';

const UA = 'Mozilla/5.0 (X11; Linux x86_64) NilBot-personal-map-importer';
const API = 'https://2minutetabletop.com/wp-json/wp/v2/product';
const FREE_CAT = 26;
const MAPS_DIR = path.resolve('data', 'maps');
const DELAY_MS = 250;

// Products that are asset/token packs rather than battle maps.
const SKIP_SLUG = /asset|token|wonderdraft|dungeondraft|icon|overlay|paper-mini|printable|brush|everything-pack|gm-screen/i;
// Images that are page furniture rather than the map itself. Note: many real
// map files end in "-Preview.jpg", so only the multi-variant collage previews
// are excluded, not "preview" generally.
const SKIP_IMG = /card-overlay|logo|variants-preview|display-picture|banner|patreon|cropped-preview/i;

const db = new Database(path.join('data', 'nilbot.db'));
db.pragma('journal_mode = WAL');
db.exec(`CREATE TABLE IF NOT EXISTS maps (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  file TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);`);
try {
	db.exec(`ALTER TABLE maps ADD COLUMN src TEXT`);
} catch {
	/* column exists */
}
try {
	db.exec(`ALTER TABLE maps ADD COLUMN user_id INTEGER`);
} catch {
	/* column exists */
}
import { resolveImportUser } from './lib.mjs';
// Collections are SHARED (user_id NULL) by default — one copy for all DMs.
// Pass --user <name> only to import into a personal layer instead.
const importUserId = process.argv.includes('--user') ? resolveImportUser(db, process.argv) : null;
fs.mkdirSync(MAPS_DIR, { recursive: true });

const existing = new Set(
	db.prepare('SELECT src FROM maps WHERE src IS NOT NULL').all().map((r) => r.src)
);

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const decode = (s) =>
	s
		.replace(/&#0?38;/g, '&')
		.replace(/&amp;/g, '&')
		.replace(/&#8217;/g, "'")
		.replace(/&#8211;/g, '–')
		.replace(/&quot;/g, '"');

async function fetchText(url) {
	const res = await fetch(url, { headers: { 'User-Agent': UA } });
	if (!res.ok) throw new Error(`${res.status} ${url}`);
	return res.text();
}

// 1. Collect all free products
let products = [];
for (let page = 1; ; page++) {
	const res = await fetch(
		`${API}?product_cat=${FREE_CAT}&per_page=100&page=${page}&_fields=slug,title,link`,
		{ headers: { 'User-Agent': UA } }
	);
	if (!res.ok) break;
	const batch = await res.json();
	if (!Array.isArray(batch) || batch.length === 0) break;
	products.push(...batch);
	const totalPages = Number(res.headers.get('x-wp-totalpages') || 1);
	if (page >= totalPages) break;
	await sleep(DELAY_MS);
}
console.log(`Found ${products.length} free products.`);

const mapProducts = products.filter((p) => !SKIP_SLUG.test(p.slug));
console.log(`${mapProducts.length} look like battle maps (skipping asset/token packs).`);

// 2. For each product: grab the featured full-res image
const insert = db.prepare(
	`INSERT INTO maps (name, file, src, user_id) VALUES (?, 'pending', ?, ${importUserId ?? 'NULL'})`
);
const setFile = db.prepare(`UPDATE maps SET file = ? WHERE id = ?`);
const remove = db.prepare(`DELETE FROM maps WHERE id = ?`);

let imported = 0;
let skipped = 0;
let failed = 0;

for (const [i, p] of mapProducts.entries()) {
	if (existing.has(p.link)) {
		skipped++;
		continue;
	}
	try {
		const html = await fetchText(p.link);
		// First og:image is the featured image at its original upload URL.
		const ogs = [...html.matchAll(/property="og:image" content="([^"]+)"/g)].map((m) => m[1]);
		let img = ogs.find(
			(u) => u.includes('/wp-content/uploads/') && !SKIP_IMG.test(u) && !u.includes('?')
		);
		if (!img) {
			// Fall back to the first product-gallery image, stripped of resize params.
			const gallery = [...html.matchAll(/data-large_image="([^"]+)"/g)]
				.map((m) => m[1].replace(/^https:\/\/i\d\.wp\.com\//, 'https://').split('?')[0])
				.filter((u) => !SKIP_IMG.test(u));
			img = gallery[0];
		}
		if (!img) {
			console.log(`  no map image: ${p.slug}`);
			failed++;
			continue;
		}

		const ext = path.extname(new URL(img).pathname).toLowerCase() || '.jpg';
		if (!['.jpg', '.jpeg', '.png', '.webp'].includes(ext)) {
			failed++;
			continue;
		}

		const imgRes = await fetch(img, { headers: { 'User-Agent': UA } });
		if (!imgRes.ok) throw new Error(`image ${imgRes.status}`);
		const buf = Buffer.from(await imgRes.arrayBuffer());
		if (buf.length < 30_000) {
			// Too small to be a real battle map — probably an icon/thumbnail.
			failed++;
			continue;
		}

		// Grid size from the filename, e.g. "Mining-Town-Winter-Day-16x22-1.jpg"
		const grid = path.basename(img).match(/(\d{1,2}x\d{1,3})/)?.[1];
		const title = decode(p.title?.rendered ?? p.slug);
		const name = `${title}${grid ? ` (${grid})` : ''} — 2MT`;

		const info = insert.run(name, p.link);
		const filename = `${info.lastInsertRowid}${ext}`;
		fs.writeFileSync(path.join(MAPS_DIR, filename), buf);
		setFile.run(filename, info.lastInsertRowid);
		imported++;
		if (imported % 25 === 0) console.log(`  ${imported} imported (${i + 1}/${mapProducts.length} checked)…`);
	} catch (e) {
		failed++;
		console.log(`  failed: ${p.slug} (${e.message})`);
	}
	await sleep(DELAY_MS);
}

console.log(`\nDone. Imported ${imported}, skipped ${skipped} (already present), failed ${failed}.`);
console.log(`Total maps in library: ${db.prepare('SELECT count(*) c FROM maps').get().c}`);
console.log('\nAttribution: maps by 2-Minute Tabletop (https://2minutetabletop.com), CC BY-NC 4.0.');
