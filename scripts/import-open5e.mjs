// Downloads every monster from the Open5e API (SRD + CC-licensed third-party
// content) into data/nilbot.db. Safe to re-run; upserts by slug.
//
//   node scripts/import-open5e.mjs
import { openDb, upsertMonster, parseCr, XP_BY_CR } from './lib.mjs';

const db = openDb();
let url = 'https://api.open5e.com/v1/monsters/?limit=500';
let count = 0;

while (url) {
  process.stdout.write(`Fetching ${url} ...\n`);
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Open5e request failed: ${res.status} ${res.statusText}`);
  const page = await res.json();

  const insertPage = db.transaction((results) => {
    for (const m of results) {
      const cr = m.cr ?? parseCr(m.challenge_rating);
      upsertMonster(db, {
        user_id: null, // Open5e content is the shared base layer
        slug: `open5e:${m.slug}`,
        name: m.name,
        cr,
        cr_text: m.challenge_rating ?? (cr !== null ? String(cr) : null),
        type: m.type ? String(m.type).toLowerCase() : null,
        size: m.size ?? null,
        alignment: m.alignment ?? null,
        ac: typeof m.armor_class === 'number' ? m.armor_class : null,
        hp: typeof m.hit_points === 'number' ? m.hit_points : null,
        xp: cr !== null ? (XP_BY_CR[cr] ?? null) : null,
        environment: Array.isArray(m.environments) ? m.environments.join(', ') : null,
        source: m.document__title ?? m.document__slug ?? 'Open5e',
        layer: 'open5e',
        data: JSON.stringify(m)
      });
    }
  });
  insertPage(page.results);
  count += page.results.length;
  url = page.next;
}

console.log(`Imported/updated ${count} monsters.`);
console.log(`Total in DB: ${db.prepare('SELECT count(*) c FROM monsters').get().c}`);
