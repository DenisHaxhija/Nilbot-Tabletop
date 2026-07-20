// One-time migration for feature/multitenancy: battle maps that came from the
// public collections (they have a src URL) move to the shared layer
// (user_id NULL) so every DM sees one copy. Personal uploads (src NULL) and
// world maps are untouched.
//
//   node scripts/share-imported-maps.mjs
import Database from 'better-sqlite3';
import path from 'node:path';

const db = new Database(path.join('data', 'nilbot.db'));
const info = db
	.prepare(
		`UPDATE maps SET user_id = NULL WHERE src IS NOT NULL AND kind = 'battle' AND user_id IS NOT NULL`
	)
	.run();
console.log(`Moved ${info.changes} imported battle maps to the shared layer.`);
console.log(
	'Shared:',
	db.prepare(`SELECT count(*) c FROM maps WHERE user_id IS NULL AND kind='battle'`).get().c,
	'| personal battle maps:',
	db.prepare(`SELECT count(*) c FROM maps WHERE user_id IS NOT NULL AND kind='battle'`).get().c
);
