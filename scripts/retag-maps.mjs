// Re-infers terrain tags for every map in the library from its name.
// Only fills maps whose tags are empty unless --force is passed.
//
//   node scripts/retag-maps.mjs [--force]
import Database from 'better-sqlite3';
import path from 'node:path';
import { inferTags } from './lib.mjs';

const db = new Database(path.join('data', 'nilbot.db'));
try {
	db.exec(`ALTER TABLE maps ADD COLUMN tags TEXT NOT NULL DEFAULT ''`);
} catch {
	/* column exists */
}

const force = process.argv.includes('--force');
const maps = db.prepare('SELECT id, name, tags FROM maps').all();
const set = db.prepare('UPDATE maps SET tags = ? WHERE id = ?');

let updated = 0;
let untagged = 0;
for (const m of maps) {
	if (m.tags && !force) continue;
	const tags = inferTags(m.name);
	set.run(tags, m.id);
	updated++;
	if (!tags) untagged++;
}
console.log(`Tagged ${updated} maps (${untagged} had no keyword match and stay untagged).`);
const counts = db
	.prepare(`SELECT tags FROM maps WHERE tags != ''`)
	.all()
	.flatMap((r) => r.tags.split(','))
	.reduce((acc, t) => ((acc[t] = (acc[t] ?? 0) + 1), acc), {});
console.log('Tag distribution:', counts);
