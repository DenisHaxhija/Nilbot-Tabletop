import Database from 'better-sqlite3';
import fs from 'node:fs';
import path from 'node:path';

// XP by CR (DMG). Keys are numeric CR values.
export const XP_BY_CR = {
  0: 10, 0.125: 25, 0.25: 50, 0.5: 100,
  1: 200, 2: 450, 3: 700, 4: 1100, 5: 1800, 6: 2300, 7: 2900, 8: 3900,
  9: 5000, 10: 5900, 11: 7200, 12: 8400, 13: 10000, 14: 11500, 15: 13000,
  16: 15000, 17: 18000, 18: 20000, 19: 22000, 20: 25000, 21: 33000,
  22: 41000, 23: 50000, 24: 62000, 25: 75000, 26: 90000, 27: 105000,
  28: 120000, 29: 135000, 30: 155000
};

export function parseCr(text) {
  if (text === null || text === undefined || text === '') return null;
  const s = String(text).trim();
  if (s.includes('/')) {
    const [a, b] = s.split('/').map(Number);
    if (b) return a / b;
    return null;
  }
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

export function openDb() {
  const dir = path.resolve('data');
  fs.mkdirSync(dir, { recursive: true });
  const db = new Database(path.join(dir, 'nilbot.db'));
  db.pragma('journal_mode = WAL');
  db.exec(`
CREATE TABLE IF NOT EXISTS monsters (
  id INTEGER PRIMARY KEY,
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  cr REAL,
  cr_text TEXT,
  type TEXT,
  size TEXT,
  alignment TEXT,
  ac INTEGER,
  hp INTEGER,
  xp INTEGER,
  environment TEXT,
  source TEXT,
  layer TEXT NOT NULL DEFAULT 'open5e',
  data TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_monsters_cr ON monsters(cr);
CREATE INDEX IF NOT EXISTS idx_monsters_type ON monsters(type);
CREATE INDEX IF NOT EXISTS idx_monsters_name ON monsters(name);
CREATE VIRTUAL TABLE IF NOT EXISTS monsters_fts USING fts5(
  name, type, source, content='monsters', content_rowid='id'
);
CREATE TRIGGER IF NOT EXISTS monsters_ai AFTER INSERT ON monsters BEGIN
  INSERT INTO monsters_fts(rowid, name, type, source) VALUES (new.id, new.name, new.type, new.source);
END;
CREATE TRIGGER IF NOT EXISTS monsters_ad AFTER DELETE ON monsters BEGIN
  INSERT INTO monsters_fts(monsters_fts, rowid, name, type, source) VALUES ('delete', old.id, old.name, old.type, old.source);
END;
CREATE TRIGGER IF NOT EXISTS monsters_au AFTER UPDATE ON monsters BEGIN
  INSERT INTO monsters_fts(monsters_fts, rowid, name, type, source) VALUES ('delete', old.id, old.name, old.type, old.source);
  INSERT INTO monsters_fts(rowid, name, type, source) VALUES (new.id, new.name, new.type, new.source);
END;
`);
  return db;
}

export function upsertMonster(db, m) {
  try {
    db.exec(`ALTER TABLE monsters ADD COLUMN user_id INTEGER`);
  } catch {
    /* column exists */
  }
  db.prepare(`
    INSERT INTO monsters (slug, name, cr, cr_text, type, size, alignment, ac, hp, xp, environment, source, layer, data, user_id)
    VALUES (@slug, @name, @cr, @cr_text, @type, @size, @alignment, @ac, @hp, @xp, @environment, @source, @layer, @data, @user_id)
    ON CONFLICT(slug) DO UPDATE SET
      name=excluded.name, cr=excluded.cr, cr_text=excluded.cr_text, type=excluded.type,
      size=excluded.size, alignment=excluded.alignment, ac=excluded.ac, hp=excluded.hp,
      xp=excluded.xp, environment=excluded.environment, source=excluded.source,
      layer=excluded.layer, data=excluded.data, user_id=excluded.user_id
  `).run(m);
}

// Terrain tag inference from a map's name. KEEP IN SYNC with src/lib/tags.ts.
export const TERRAIN_KEYWORDS = {
  mountain: ['mountain', 'cliff', 'peak', 'crag', 'quarry', 'mine', 'mining', 'gravel', 'rocky', 'canyon', 'pass', 'plateau', 'summit'],
  swamp: ['swamp', 'bog', 'marsh', 'mire', 'fen', 'bayou'],
  forest: ['forest', 'wood', 'grove', 'glade', 'jungle', 'thicket', 'oak', 'pine'],
  dungeon: ['dungeon', 'labyrinth', 'crypt', 'tomb', 'catacomb', 'vault', 'prison', 'sewer', 'cell'],
  cave: ['cave', 'cavern', 'grotto', 'lair', 'chasm', 'underdark', 'mineshaft'],
  urban: ['town', 'city', 'street', 'market', 'tavern', 'inn', 'shop', 'house', 'village', 'chapel', 'church', 'mansion', 'warehouse', 'alley', 'plaza', 'guild', 'library', 'academy', 'arena', 'castle', 'keep', 'tower', 'fort'],
  plains: ['field', 'farm', 'meadow', 'plain', 'grassland', 'hill', 'road', 'crossroad', 'camp'],
  coast: ['coast', 'beach', 'shore', 'island', 'ship', 'boat', 'harbor', 'harbour', 'port', 'pier', 'sea', 'ocean', 'lake', 'river', 'bridge', 'waterfall', 'dock'],
  desert: ['desert', 'dune', 'oasis', 'pyramid', 'egyptian', 'wasteland'],
  arctic: ['snow', 'ice', 'frozen', 'winter', 'arctic', 'tundra', 'glacier'],
  ruins: ['ruin', 'ancient', 'abandoned', 'overgrown', 'temple', 'shrine', 'altar']
};

export function inferTags(name) {
  const n = name.toLowerCase();
  const tags = [];
  for (const [tag, words] of Object.entries(TERRAIN_KEYWORDS)) {
    // Word-boundary match: "peak" must not match inside "speakeasy".
    if (words.some((w) => new RegExp(`\\b${w}`).test(n))) tags.push(tag);
  }
  return tags.join(',');
}

// Resolve which user an import belongs to: --user <name> flag, else the only
// account, else null (shared layer / claimed by the first account created).
export function resolveImportUser(db, argv) {
  const i = argv.indexOf('--user');
  if (i !== -1 && argv[i + 1]) {
    const row = db.prepare('SELECT id FROM users WHERE username = ?').get(argv[i + 1]);
    if (!row) throw new Error(`No user named "${argv[i + 1]}"`);
    return row.id;
  }
  try {
    const users = db.prepare('SELECT id FROM users').all();
    if (users.length === 1) return users[0].id;
    if (users.length > 1)
      throw new Error('Multiple accounts exist — pass --user <name> to say whose import this is.');
  } catch (e) {
    if (String(e.message).includes('Multiple accounts')) throw e;
    // users table may not exist yet — fall through to shared/unclaimed
  }
  return null;
}
