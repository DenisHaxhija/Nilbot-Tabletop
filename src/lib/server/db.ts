import Database from 'better-sqlite3';
import fs from 'node:fs';
import path from 'node:path';

const DATA_DIR = path.resolve('data');
fs.mkdirSync(DATA_DIR, { recursive: true });

export const db = new Database(path.join(DATA_DIR, 'nilbot.db'));
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

CREATE TABLE IF NOT EXISTS notes (
  id INTEGER PRIMARY KEY,
  title TEXT NOT NULL DEFAULT 'Untitled',
  content TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS battles (
  id INTEGER PRIMARY KEY,
  note_id INTEGER NOT NULL,
  title TEXT NOT NULL DEFAULT 'Battle',
  description TEXT NOT NULL DEFAULT '',
  data TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_battles_note ON battles(note_id);
`);

// Migration: map column for saved battle maps (ignore if it already exists).
try {
	db.exec(`ALTER TABLE battles ADD COLUMN map TEXT`);
} catch {
	// column already present
}

db.exec(`
CREATE TABLE IF NOT EXISTS maps (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  file TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
`);
try {
	db.exec(`ALTER TABLE maps ADD COLUMN src TEXT`);
} catch {
	// column already present
}
try {
	db.exec(`ALTER TABLE monsters ADD COLUMN token TEXT`);
} catch {
	// column already present
}

db.exec(`
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  pass_hash TEXT NOT NULL,
  salt TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS auth_sessions (
  token TEXT PRIMARY KEY,
  user_id INTEGER NOT NULL,
  expires_at TEXT NOT NULL
);
`);

// Per-user data ownership. user_id NULL on monsters = shared base layer (Open5e).
for (const table of ['notes', 'battles', 'maps', 'monsters']) {
	try {
		db.exec(`ALTER TABLE ${table} ADD COLUMN user_id INTEGER`);
	} catch {
		// column already present
	}
}
try {
	db.exec(`ALTER TABLE maps ADD COLUMN tags TEXT NOT NULL DEFAULT ''`);
} catch {
	// column already present
}

db.exec(`
CREATE TABLE IF NOT EXISTS characters (
  id INTEGER PRIMARY KEY,
  user_id INTEGER NOT NULL,
  name TEXT NOT NULL,
  title TEXT NOT NULL DEFAULT '',
  description TEXT NOT NULL DEFAULT '',
  notes TEXT NOT NULL DEFAULT '',
  file TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
`);

try {
	db.exec(`ALTER TABLE characters ADD COLUMN on_canvas INTEGER NOT NULL DEFAULT 0`);
} catch {
	// column already present
}
try {
	db.exec(`ALTER TABLE characters ADD COLUMN folder TEXT NOT NULL DEFAULT ''`);
} catch {
	// column already present
}
// Optional link to a stat sheet (monsters.slug — bestiary or Custom).
try {
	db.exec(`ALTER TABLE characters ADD COLUMN sheet_slug TEXT`);
} catch {
	// column already present
}
try {
	db.exec(`ALTER TABLE pcs ADD COLUMN sheet_slug TEXT`);
} catch {
	// column already present
}
// Spoiler protection: hidden groups collapse on the Characters index; a
// character with hide_name set shows as "???" on the player-facing canvas.
try {
	db.exec(`ALTER TABLE char_groups ADD COLUMN hidden INTEGER NOT NULL DEFAULT 0`);
} catch {
	// column already present
}
try {
	db.exec(`ALTER TABLE characters ADD COLUMN hide_name INTEGER NOT NULL DEFAULT 0`);
} catch {
	// column already present
}

// True when the slug names a sheet this user can see (shared or own).
export function validSheetSlug(slug: string, userId: number): boolean {
	return !!db
		.prepare('SELECT 1 FROM monsters WHERE slug = ? AND (user_id IS NULL OR user_id = ?)')
		.get(slug, userId);
}

// Reads a sheet_slug field off a character form. Returns the slug when it
// exists and is visible to this user (shared or own), null for an explicit
// unlink (empty value), undefined when absent/invalid (leave unchanged).
export function sheetSlugFromForm(form: FormData, userId: number): string | null | undefined {
	const raw = form.get('sheet_slug');
	if (raw === null) return undefined;
	const slug = String(raw).trim();
	if (!slug) return null;
	return validSheetSlug(slug, userId) ? slug : undefined;
}
try {
	db.exec(`ALTER TABLE notes ADD COLUMN src TEXT`);
} catch {
	// column already present
}
try {
	db.exec(`ALTER TABLE maps ADD COLUMN kind TEXT NOT NULL DEFAULT 'battle'`);
} catch {
	// column already present
}
try {
	db.exec(`ALTER TABLE battles ADD COLUMN published INTEGER NOT NULL DEFAULT 0`);
} catch {
	// column already present
}
// Per-user storage accounting (see src/lib/server/storage.ts).
try {
	db.exec(`ALTER TABLE users ADD COLUMN storage_bytes INTEGER NOT NULL DEFAULT 0`);
} catch {
	// column already present
}
try {
	db.exec(`ALTER TABLE users ADD COLUMN storage_cap_mb INTEGER`);
} catch {
	// column already present
}
// Size of each stored user file, so deletes can decrement usage on any backend.
for (const [table, col] of [
	['maps', 'bytes'],
	['pcs', 'bytes'],
	['characters', 'bytes'],
	['songs', 'bytes'],
	['monsters', 'token_bytes']
] as const) {
	try {
		db.exec(`ALTER TABLE ${table} ADD COLUMN ${col} INTEGER`);
	} catch {
		// column already present
	}
}

db.exec(`
CREATE TABLE IF NOT EXISTS char_groups (
  id INTEGER PRIMARY KEY,
  user_id INTEGER NOT NULL,
  name TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS items (
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
);
CREATE INDEX IF NOT EXISTS idx_items_name ON items(name);
CREATE TABLE IF NOT EXISTS quick_notes (
  id INTEGER PRIMARY KEY,
  note_id INTEGER NOT NULL,
  user_id INTEGER NOT NULL,
  content TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS songs (
  id INTEGER PRIMARY KEY,
  user_id INTEGER NOT NULL,
  name TEXT NOT NULL,
  grp TEXT NOT NULL DEFAULT '',
  url TEXT,
  file TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS shop_stock (
  user_id INTEGER NOT NULL,
  item_id INTEGER NOT NULL,
  price TEXT NOT NULL DEFAULT '',
  PRIMARY KEY (user_id, item_id)
);
`);

db.exec(`
CREATE TABLE IF NOT EXISTS pcs (
  id INTEGER PRIMARY KEY,
  user_id INTEGER NOT NULL,
  name TEXT NOT NULL,
  class TEXT NOT NULL DEFAULT '',
  file TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
`);

// Settings are per-user; rebuild the table if it predates that.
const settingsCols = db.prepare(`PRAGMA table_info(settings)`).all() as { name: string }[];
if (settingsCols.length > 0 && !settingsCols.some((c) => c.name === 'user_id')) {
	db.exec(`DROP TABLE settings`);
}
db.exec(`
CREATE TABLE IF NOT EXISTS settings (
  user_id INTEGER NOT NULL,
  key TEXT NOT NULL,
  value TEXT NOT NULL,
  PRIMARY KEY (user_id, key)
);
`);

export function getSetting(userId: number, key: string, fallback: string): string {
	const row = db
		.prepare('SELECT value FROM settings WHERE user_id = ? AND key = ?')
		.get(userId, key) as { value: string } | undefined;
	return row?.value ?? fallback;
}

export function setSetting(userId: number, key: string, value: string) {
	db.prepare(
		'INSERT INTO settings (user_id, key, value) VALUES (?, ?, ?) ON CONFLICT(user_id, key) DO UPDATE SET value = excluded.value'
	).run(userId, key, value);
}

export interface MonsterRow {
  id: number;
  slug: string;
  name: string;
  cr: number | null;
  cr_text: string | null;
  type: string | null;
  size: string | null;
  alignment: string | null;
  ac: number | null;
  hp: number | null;
  xp: number | null;
  environment: string | null;
  source: string | null;
  layer: string;
  data: string;
  token: string | null;
  user_id: number | null;
}

export interface MonsterFilters {
  q?: string;
  type?: string;
  crMin?: number;
  crMax?: number;
  size?: string;
  source?: string;
  limit?: number;
  offset?: number;
}

export function searchMonsters(
  f: MonsterFilters,
  userId: number
): { rows: MonsterRow[]; total: number } {
  const where: string[] = ['(m.user_id IS NULL OR m.user_id = @uid)'];
  const params: Record<string, unknown> = { uid: userId };

  if (f.q && f.q.trim()) {
    // Prefix-match every term the user typed via FTS5.
    const ftsQuery = f.q
      .trim()
      .split(/\s+/)
      .map((t) => `"${t.replace(/"/g, '')}"*`)
      .join(' ');
    where.push(`m.id IN (SELECT rowid FROM monsters_fts WHERE monsters_fts MATCH @fts)`);
    params.fts = ftsQuery;
  }
  if (f.type) {
    where.push(`m.type = @type`);
    params.type = f.type;
  }
  if (f.size) {
    where.push(`m.size = @size`);
    params.size = f.size;
  }
  if (f.source) {
    where.push(`m.source = @source`);
    params.source = f.source;
  }
  if (f.crMin !== undefined) {
    where.push(`m.cr >= @crMin`);
    params.crMin = f.crMin;
  }
  if (f.crMax !== undefined) {
    where.push(`m.cr <= @crMax`);
    params.crMax = f.crMax;
  }

  const whereSql = `WHERE ${where.join(' AND ')}`;
  const total = (
    db.prepare(`SELECT count(*) c FROM monsters m ${whereSql}`).get(params) as { c: number }
  ).c;
  const rows = db
    .prepare(
      `SELECT * FROM monsters m ${whereSql} ORDER BY m.name LIMIT @limit OFFSET @offset`
    )
    .all({ ...params, limit: f.limit ?? 50, offset: f.offset ?? 0 }) as MonsterRow[];
  return { rows, total };
}

export function getMonster(slug: string, userId: number): MonsterRow | undefined {
  return db
    .prepare(`SELECT * FROM monsters WHERE slug = ? AND (user_id IS NULL OR user_id = ?)`)
    .get(slug, userId) as MonsterRow | undefined;
}

export function monsterFacets(userId: number) {
  const types = db
    .prepare(
      `SELECT DISTINCT type FROM monsters WHERE type IS NOT NULL AND (user_id IS NULL OR user_id = ?) ORDER BY type`
    )
    .all(userId)
    .map((r) => (r as { type: string }).type);
  const sources = db
    .prepare(
      `SELECT DISTINCT source FROM monsters WHERE source IS NOT NULL AND (user_id IS NULL OR user_id = ?) ORDER BY source`
    )
    .all(userId)
    .map((r) => (r as { source: string }).source);
  const sizes = db
    .prepare(
      `SELECT DISTINCT size FROM monsters WHERE size IS NOT NULL AND (user_id IS NULL OR user_id = ?) ORDER BY size`
    )
    .all(userId)
    .map((r) => (r as { size: string }).size);
  return { types, sources, sizes };
}
