// Downloads all magic items from the Open5e API (SRD + CC-licensed content)
// into the items table as the shared base layer. Safe to re-run.
//
//   node scripts/import-open5e-items.mjs
import Database from 'better-sqlite3';
import path from 'node:path';

const db = new Database(path.join('data', 'nilbot.db'));
db.pragma('journal_mode = WAL');
db.exec(`CREATE TABLE IF NOT EXISTS items (
  id INTEGER PRIMARY KEY,
  slug TEXT UNIQUE,
  name TEXT NOT NULL,
  type TEXT,
  rarity TEXT,
  attunement TEXT,
  desc TEXT NOT NULL DEFAULT '',
  source TEXT,
  layer TEXT NOT NULL DEFAULT 'user',
  user_id INTEGER,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);`);

const upsert = db.prepare(`
  INSERT INTO items (slug, name, type, rarity, attunement, desc, source, layer, user_id)
  VALUES (@slug, @name, @type, @rarity, @attunement, @desc, @source, 'open5e', NULL)
  ON CONFLICT(slug) DO UPDATE SET
    name=excluded.name, type=excluded.type, rarity=excluded.rarity,
    attunement=excluded.attunement, desc=excluded.desc, source=excluded.source
`);

let url = 'https://api.open5e.com/v1/magicitems/?limit=500';
let count = 0;
while (url) {
	console.log(`Fetching ${url} ...`);
	const res = await fetch(url);
	if (!res.ok) throw new Error(`Open5e request failed: ${res.status}`);
	const page = await res.json();
	const tx = db.transaction((results) => {
		for (const it of results) {
			upsert.run({
				slug: `open5e:${it.slug}`,
				name: it.name,
				type: it.type ?? null,
				rarity: it.rarity ?? null,
				attunement: it.requires_attunement ?? '',
				desc: it.desc ?? '',
				source: it.document__title ?? 'Open5e'
			});
		}
	});
	tx(page.results);
	count += page.results.length;
	url = page.next;
}
console.log(`Imported/updated ${count} items.`);
console.log('Total items:', db.prepare('SELECT count(*) c FROM items').get().c);
