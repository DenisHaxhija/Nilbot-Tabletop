// One-time migration to the per-user storage layout (feature/multitenancy).
//
// Moves user files from the flat area dirs (data/maps, data/pcs,
// data/characters, data/music, custom tokens in data/tokens) into
// data/store/u<userId>/<area>/<id><ext>, re-encoding images as WebP on the
// way, rewrites each row's file column to the new key, records per-row bytes,
// and backfills users.storage_bytes.
//
// Safe to re-run: rows whose file already contains "/" are skipped.
// Old files are only deleted after the new one is written.
//
//   node scripts/migrate-user-storage.mjs [--dry-run]

import fs from 'node:fs';
import path from 'node:path';
import Database from 'better-sqlite3';
import sharp from 'sharp';

const DRY = process.argv.includes('--dry-run');
const ROOT = path.resolve('data');
const STORE = path.join(ROOT, 'store');
const db = new Database(path.join(ROOT, 'nilbot.db'));
db.pragma('journal_mode = WAL');

const IMAGE_EXTS = ['.png', '.jpg', '.jpeg', '.webp'];

async function toWebp(buf, ext) {
	if (!IMAGE_EXTS.includes(ext)) return { buf, ext };
	try {
		const out = await sharp(buf).rotate().webp({ quality: 82 }).toBuffer();
		return out.length < buf.length ? { buf: out, ext: '.webp' } : { buf, ext };
	} catch {
		return { buf, ext };
	}
}

// [table, area, old dir, file column, bytes column, extra WHERE]
const AREAS = [
	['maps', 'maps', 'maps', 'file', 'bytes', ''],
	['pcs', 'pcs', 'pcs', 'file', 'bytes', ''],
	['characters', 'characters', 'characters', 'file', 'bytes', ''],
	['songs', 'music', 'music', 'file', 'bytes', ''],
	// Only user-built custom tokens move; shared imported token art stays put.
	['monsters', 'tokens', 'tokens', 'token', 'token_bytes', 'AND user_id IS NOT NULL']
];

let moved = 0;
let saved = 0;
let missing = 0;

for (const [table, area, dir, fileCol, bytesCol, extra] of AREAS) {
	const rows = db
		.prepare(
			`SELECT id, ${fileCol} AS file, user_id FROM ${table}
			 WHERE ${fileCol} IS NOT NULL AND ${fileCol} != '' AND ${fileCol} NOT LIKE '%/%' ${extra}`
		)
		.all();
	const update = db.prepare(`UPDATE ${table} SET ${fileCol} = ?, ${bytesCol} = ? WHERE id = ?`);

	for (const row of rows) {
		if (!row.user_id) {
			console.warn(`  ! ${table}#${row.id} has no user_id — skipped`);
			continue;
		}
		const oldPath = path.join(ROOT, dir, path.basename(row.file));
		if (!fs.existsSync(oldPath)) {
			console.warn(`  ! ${table}#${row.id}: ${oldPath} missing — clearing row file`);
			if (!DRY) update.run(null, null, row.id);
			missing++;
			continue;
		}
		const raw = fs.readFileSync(oldPath);
		const { buf, ext } = await toWebp(raw, path.extname(row.file).toLowerCase());
		const key = `u${row.user_id}/${area}/${row.id}${ext}`;
		if (!DRY) {
			const dest = path.join(STORE, key);
			fs.mkdirSync(path.dirname(dest), { recursive: true });
			fs.writeFileSync(dest, buf);
			update.run(key, buf.length, row.id);
			fs.unlinkSync(oldPath);
		}
		moved++;
		saved += raw.length - buf.length;
		if (moved % 100 === 0) console.log(`  …${moved} files (${(saved / 1e6).toFixed(0)} MB saved so far)`);
	}
	console.log(`${table}: ${rows.length} rows processed`);
}

// Backfill usage from the now-authoritative per-row byte counts.
if (!DRY) {
	db.exec(`
		UPDATE users SET storage_bytes = COALESCE(
			(SELECT COALESCE(SUM(bytes), 0) FROM maps WHERE maps.user_id = users.id), 0)
			+ COALESCE((SELECT COALESCE(SUM(bytes), 0) FROM pcs WHERE pcs.user_id = users.id), 0)
			+ COALESCE((SELECT COALESCE(SUM(bytes), 0) FROM characters WHERE characters.user_id = users.id), 0)
			+ COALESCE((SELECT COALESCE(SUM(bytes), 0) FROM songs WHERE songs.user_id = users.id), 0)
			+ COALESCE((SELECT COALESCE(SUM(token_bytes), 0) FROM monsters WHERE monsters.user_id = users.id), 0)
	`);
	// Remove area dirs that are now empty.
	for (const dir of ['maps', 'pcs', 'characters', 'music']) {
		const p = path.join(ROOT, dir);
		if (fs.existsSync(p) && fs.readdirSync(p).length === 0) fs.rmdirSync(p);
	}
}

console.log(
	`${DRY ? '[dry-run] ' : ''}Done: ${moved} files migrated, ${(saved / 1e6).toFixed(1)} MB saved by compression, ${missing} rows had missing files.`
);
for (const u of db.prepare('SELECT id, username, storage_bytes FROM users').all()) {
	console.log(`  u${u.id} ${u.username}: ${((u.storage_bytes ?? 0) / 1e6).toFixed(1)} MB`);
}
