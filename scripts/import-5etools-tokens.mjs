// Matches 5e.tools token art (from a local clone of the 5etools-img repo's
// bestiary/tokens folder) to monsters in the NilBot bestiary and copies the
// matched images into data/tokens/.
//
// Personal use only — never distribute these images with the app.
//
//   node scripts/import-5etools-tokens.mjs /path/to/5etools-img/bestiary/tokens
import Database from 'better-sqlite3';
import fs from 'node:fs';
import path from 'node:path';

const tokensRoot = process.argv[2];
if (!tokensRoot || !fs.existsSync(tokensRoot)) {
	console.error('Usage: node scripts/import-5etools-tokens.mjs <path to bestiary/tokens>');
	process.exit(1);
}

const OUT_DIR = path.resolve('data', 'tokens');
fs.mkdirSync(OUT_DIR, { recursive: true });

const db = new Database(path.join('data', 'nilbot.db'));
db.pragma('journal_mode = WAL');
try {
	db.exec(`ALTER TABLE monsters ADD COLUMN token TEXT`);
} catch {
	/* column exists */
}

// Preferred source order when the same monster name exists in several books.
const SOURCE_PRIORITY = ['MM', 'MPMM', 'VGM', 'MTF', 'TCE', 'FTD', 'TOB1-2023', 'TOB', 'CC'];
function sourceRank(src) {
	const i = SOURCE_PRIORITY.indexOf(src.toUpperCase());
	return i === -1 ? SOURCE_PRIORITY.length : i;
}

const norm = (s) =>
	s
		.toLowerCase()
		.normalize('NFD')
		.replace(/[̀-ͯ]/g, '')
		.replace(/[^a-z0-9]+/g, '');

// Index every token file by normalized monster name.
const index = new Map(); // normName -> [{source, file, rank}]
for (const source of fs.readdirSync(tokensRoot)) {
	const dir = path.join(tokensRoot, source);
	if (!fs.statSync(dir).isDirectory()) continue;
	for (const f of fs.readdirSync(dir)) {
		if (!/\.(webp|png)$/i.test(f)) continue;
		const name = norm(path.basename(f).replace(/\.(webp|png)$/i, ''));
		if (!index.has(name)) index.set(name, []);
		index.get(name).push({ source, file: path.join(dir, f), rank: sourceRank(source) });
	}
}
for (const list of index.values()) list.sort((a, b) => a.rank - b.rank);
console.log(`Indexed ${index.size} distinct token names from ${tokensRoot}`);

const monsters = db.prepare('SELECT id, slug, name, layer, data FROM monsters').all();
const setToken = db.prepare('UPDATE monsters SET token = ? WHERE id = ?');

let matched = 0;
let already = 0;
let missed = 0;

for (const m of monsters) {
	const outFile = `${m.id}.webp`;
	const outPath = path.join(OUT_DIR, outFile);
	if (fs.existsSync(outPath)) {
		already++;
		if (!m.token) setToken.run(outFile, m.id);
		continue;
	}

	let hit = null;

	// 5etools-imported monsters carry their exact source code — try that first.
	if (m.layer === 'user') {
		try {
			const d = JSON.parse(m.data);
			if (d.source) {
				const candidates = index.get(norm(m.name)) ?? [];
				hit = candidates.find((c) => c.source.toUpperCase() === String(d.source).toUpperCase());
			}
		} catch {
			/* ignore */
		}
	}
	// Otherwise (and as fallback): best-ranked source with this exact name.
	if (!hit) {
		const candidates = index.get(norm(m.name)) ?? [];
		hit = candidates[0];
	}

	if (hit) {
		fs.copyFileSync(hit.file, outPath);
		setToken.run(outFile, m.id);
		matched++;
	} else {
		missed++;
	}
}

console.log(`Matched ${matched} tokens (${already} already present), no art for ${missed} monsters.`);
console.log(`Token files live in data/tokens/ — letter tokens remain the fallback.`);
