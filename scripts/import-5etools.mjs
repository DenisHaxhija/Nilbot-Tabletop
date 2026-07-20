// Imports monsters from 5e.tools-format bestiary JSON files that YOU supply.
// These files are never bundled with the app — point this script at files on
// your own disk:
//
//   node scripts/import-5etools.mjs path/to/bestiary-xyz.json [more.json ...]
//
// Accepts the standard 5e.tools bestiary shape: { "monster": [ {...}, ... ] }
import fs from 'node:fs';
import { openDb, upsertMonster, resolveImportUser, XP_BY_CR } from './lib.mjs';

const files = process.argv.slice(2);
if (files.length === 0) {
  console.error('Usage: node scripts/import-5etools.mjs <bestiary.json> [...]');
  process.exit(1);
}

const SIZE = { T: 'Tiny', S: 'Small', M: 'Medium', L: 'Large', H: 'Huge', G: 'Gargantuan' };
const ALIGN = {
  L: 'lawful', N: 'neutral', C: 'chaotic', G: 'good', E: 'evil',
  U: 'unaligned', A: 'any alignment'
};

function crOf(m) {
  const raw = typeof m.cr === 'object' && m.cr !== null ? m.cr.cr : m.cr;
  if (raw === undefined || raw === null) return { cr: null, text: null };
  const s = String(raw);
  if (s.includes('/')) {
    const [a, b] = s.split('/').map(Number);
    return { cr: b ? a / b : null, text: s };
  }
  const n = Number(s);
  return { cr: Number.isFinite(n) ? n : null, text: s };
}

function typeOf(m) {
  if (typeof m.type === 'string') return m.type.toLowerCase();
  if (m.type && typeof m.type === 'object' && m.type.type) {
    return typeof m.type.type === 'string' ? m.type.type.toLowerCase() : null;
  }
  return null;
}

function acOf(m) {
  const a = Array.isArray(m.ac) ? m.ac[0] : m.ac;
  if (typeof a === 'number') return a;
  if (a && typeof a === 'object' && typeof a.ac === 'number') return a.ac;
  return null;
}

const db = openDb();
const userId = resolveImportUser(db, process.argv);
let count = 0;

for (const file of files) {
  const json = JSON.parse(fs.readFileSync(file, 'utf8'));
  const monsters = json.monster ?? [];
  const insert = db.transaction(() => {
    for (const m of monsters) {
      if (!m.name) continue;
      if (m._copy) continue; // variant stubs that copy another entry; skip for now
      const { cr, text } = crOf(m);
      const source = m.source ?? 'homebrew';
      const slug = `5etools:${source.toLowerCase()}:${m.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
      upsertMonster(db, {
        user_id: userId,
        slug,
        name: m.name,
        cr,
        cr_text: text,
        type: typeOf(m),
        size: Array.isArray(m.size) ? (SIZE[m.size[0]] ?? m.size[0]) : null,
        alignment: Array.isArray(m.alignment)
          ? m.alignment.map((x) => (typeof x === 'string' ? ALIGN[x] ?? x : '')).filter(Boolean).join(' ')
          : null,
        ac: acOf(m),
        hp: m.hp?.average ?? (typeof m.hp === 'number' ? m.hp : null),
        xp: cr !== null ? (XP_BY_CR[cr] ?? null) : null,
        environment: Array.isArray(m.environment) ? m.environment.join(', ') : null,
        source,
        layer: 'user',
        data: JSON.stringify({ format: '5etools', ...m })
      });
      count++;
    }
  });
  insert();
  console.log(`${file}: ${monsters.length} entries processed`);
}

console.log(`Imported/updated ${count} monsters.`);
