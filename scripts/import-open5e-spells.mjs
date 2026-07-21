// Downloads all spells from the Open5e API (SRD + CC-licensed content) into
// the spells table as the shared base layer. Safe to re-run.
//
//   node scripts/import-open5e-spells.mjs
import Database from 'better-sqlite3';
import path from 'node:path';

const db = new Database(path.join('data', 'nilbot.db'));
db.pragma('journal_mode = WAL');
db.exec(`CREATE TABLE IF NOT EXISTS spells (
  id INTEGER PRIMARY KEY,
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  level INTEGER NOT NULL DEFAULT 0,
  school TEXT,
  classes TEXT NOT NULL DEFAULT '',
  casting_time TEXT,
  range TEXT,
  components TEXT,
  duration TEXT,
  concentration INTEGER NOT NULL DEFAULT 0,
  ritual INTEGER NOT NULL DEFAULT 0,
  source TEXT,
  layer TEXT NOT NULL DEFAULT 'open5e',
  data TEXT NOT NULL,
  user_id INTEGER
);`);

const upsert = db.prepare(`
  INSERT INTO spells (slug, name, level, school, classes, casting_time, range, components, duration, concentration, ritual, source, layer, data, user_id)
  VALUES (@slug, @name, @level, @school, @classes, @casting_time, @range, @components, @duration, @concentration, @ritual, @source, 'open5e', @data, NULL)
  ON CONFLICT(slug) DO UPDATE SET
    name=excluded.name, level=excluded.level, school=excluded.school,
    classes=excluded.classes, casting_time=excluded.casting_time,
    range=excluded.range, components=excluded.components,
    duration=excluded.duration, concentration=excluded.concentration,
    ritual=excluded.ritual, source=excluded.source, data=excluded.data
`);

const cap = (s) => (s ? s[0].toUpperCase() + s.slice(1).toLowerCase() : s);

let url = 'https://api.open5e.com/v1/spells/?limit=500';
let count = 0;
while (url) {
	console.log(`Fetching ${url} ...`);
	const res = await fetch(url);
	if (!res.ok) throw new Error(`Open5e request failed: ${res.status}`);
	const page = await res.json();
	const tx = db.transaction((results) => {
		for (const s of results) {
			upsert.run({
				slug: `open5e:${s.slug}`,
				name: s.name,
				level: s.level_int ?? 0,
				school: cap(s.school ?? null),
				classes: s.dnd_class ?? '',
				casting_time: s.casting_time ?? null,
				range: s.range ?? null,
				components: s.components ?? null,
				duration: s.duration ?? null,
				concentration: s.concentration === 'yes' ? 1 : 0,
				ritual: s.ritual === 'yes' ? 1 : 0,
				source: s.document__title ?? 'Open5e',
				data: JSON.stringify(s)
			});
		}
	});
	tx(page.results);
	count += page.results.length;
	url = page.next;
}
console.log(`Imported/updated ${count} spells.`);
console.log('Total spells:', db.prepare('SELECT count(*) c FROM spells').get().c);
