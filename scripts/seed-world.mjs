#!/usr/bin/env node
// Seed a Tabletop campaign world from an existing NilBot data dir —
// compendium (monsters + token art, items, spells) and battle/world maps.
//
// Operator-run on your own machine, pouring your own instance's data into
// your own world (the shared-layer licensing rule in CLAUDE.md). Never
// bake the result into a distributed image or seed.
//
// Usage:
//   node scripts/seed-world.mjs --from ../NilBot/data \
//     --world ~/.config/nilbot-tabletop/campaigns/<id> [--no-maps]
//
// Idempotent: compendium upserts by slug, maps skip by src (name when
// src is missing). Run it again after new imports land in the source.

import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import Database from 'better-sqlite3';

function arg(name, fallback = null) {
	const i = process.argv.indexOf(name);
	return i > -1 && process.argv[i + 1] ? process.argv[i + 1] : fallback;
}
const expand = (p) => (p.startsWith('~') ? path.join(os.homedir(), p.slice(1)) : p);

const fromDir = expand(arg('--from', ''));
const worldDir = expand(arg('--world', ''));
const doMaps = !process.argv.includes('--no-maps');
if (!fromDir || !worldDir) {
	console.error('Usage: node scripts/seed-world.mjs --from <nilbot-data-dir> --world <campaign-dir> [--no-maps]');
	process.exit(1);
}

const srcDbPath = path.join(fromDir, 'nilbot.db');
const dstDbPath = path.join(worldDir, 'data', 'nilbot.db');
if (!fs.existsSync(srcDbPath)) {
	console.error(`No source db at ${srcDbPath}`);
	process.exit(1);
}
if (!fs.existsSync(dstDbPath)) {
	console.error(`No world db at ${dstDbPath} — open the campaign once first so its world exists.`);
	process.exit(1);
}
const srcStore = path.join(fromDir, 'store');
const dstStore = path.join(worldDir, 'data', 'store');

const src = new Database(srcDbPath, { readonly: true });
const dst = new Database(dstDbPath);
dst.pragma('journal_mode = WAL');

const dm = dst.prepare(`SELECT id FROM users WHERE role = 'dm' ORDER BY id LIMIT 1`).get();
if (!dm) {
	console.error('World has no DM user yet — open the campaign once first.');
	process.exit(1);
}

function copyFile(key, destKey = key) {
	const from = path.join(srcStore, key);
	if (!fs.existsSync(from)) return false;
	const to = path.join(dstStore, destKey);
	fs.mkdirSync(path.dirname(to), { recursive: true });
	fs.copyFileSync(from, to);
	return true;
}

// --- compendium: shared layer only (user_id IS NULL), upsert by slug ---

let addedBytes = 0;

const monsters = src.prepare(`SELECT * FROM monsters WHERE user_id IS NULL`).all();
const insMonster = dst.prepare(`
	INSERT INTO monsters (slug, name, cr, cr_text, type, size, alignment, ac, hp, xp,
	                      environment, source, layer, data, token, token_bytes, user_id)
	VALUES (@slug, @name, @cr, @cr_text, @type, @size, @alignment, @ac, @hp, @xp,
	        @environment, @source, @layer, @data, NULL, NULL, NULL)
	ON CONFLICT(slug) DO NOTHING`);
let mNew = 0;
dst.transaction(() => {
	for (const m of monsters) mNew += insMonster.run(m).changes;
})();

// Shared token art is an instance-level asset: plain files in data/tokens/,
// keyed by bare filename (see /api/token/[slug]). Copied outside the
// per-user store, no quota accounting.
const srcTokens = path.join(fromDir, 'tokens');
const dstTokens = path.join(worldDir, 'data', 'tokens');
const setToken = dst.prepare(
	`UPDATE monsters SET token = ? WHERE slug = ? AND user_id IS NULL AND token IS NULL`
);
let tokens = 0;
for (const m of monsters) {
	if (!m.token || m.token.includes('/')) continue;
	const from = path.join(srcTokens, path.basename(m.token));
	if (!fs.existsSync(from)) continue;
	fs.mkdirSync(dstTokens, { recursive: true });
	fs.copyFileSync(from, path.join(dstTokens, path.basename(m.token)));
	tokens += setToken.run(m.token, m.slug).changes;
}
console.log(`monsters: +${mNew} (of ${monsters.length} shared), token art linked: ${tokens}`);

const items = src.prepare(`SELECT * FROM items WHERE user_id IS NULL`).all();
const insItem = dst.prepare(`
	INSERT INTO items (slug, name, type, rarity, attunement, desc, source, layer, user_id)
	VALUES (@slug, @name, @type, @rarity, @attunement, @desc, @source, @layer, NULL)
	ON CONFLICT(slug) DO NOTHING`);
let iNew = 0;
dst.transaction(() => {
	for (const it of items) iNew += insItem.run(it).changes;
})();
console.log(`items: +${iNew} (of ${items.length} shared)`);

const spells = src.prepare(`SELECT * FROM spells WHERE user_id IS NULL`).all();
const insSpell = dst.prepare(`
	INSERT INTO spells (slug, name, level, school, classes, casting_time, range, components,
	                    duration, concentration, ritual, source, layer, data, user_id)
	VALUES (@slug, @name, @level, @school, @classes, @casting_time, @range, @components,
	        @duration, @concentration, @ritual, @source, @layer, @data, NULL)
	ON CONFLICT(slug) DO NOTHING`);
let sNew = 0;
dst.transaction(() => {
	for (const s of spells) sNew += insSpell.run(s).changes;
})();
console.log(`spells: +${sNew} (of ${spells.length} shared)`);

// --- maps: become the world DM's own, files copied into the world store ---

if (doMaps) {
	const maps = src.prepare(`SELECT * FROM maps`).all();
	const haveSrc = new Set(
		dst.prepare(`SELECT src FROM maps WHERE src IS NOT NULL`).all().map((r) => r.src)
	);
	const haveName = new Set(dst.prepare(`SELECT name FROM maps`).all().map((r) => r.name));
	const insMap = dst.prepare(`
		INSERT INTO maps (name, file, src, tags, kind, user_id, bytes, created_at)
		VALUES (?, '', ?, ?, ?, ?, NULL, ?)`);
	const setFile = dst.prepare(`UPDATE maps SET file = ?, bytes = ? WHERE id = ?`);
	let mapsNew = 0;
	let missing = 0;
	for (const m of maps) {
		if (m.src ? haveSrc.has(m.src) : haveName.has(m.name)) continue;
		if (!m.file || !fs.existsSync(path.join(srcStore, m.file))) {
			missing++;
			continue;
		}
		const ext = path.extname(m.file) || '.webp';
		const info = insMap.run(m.name, m.src, m.tags ?? '', m.kind ?? 'battle', dm.id, m.created_at);
		const newId = info.lastInsertRowid;
		const destKey = `u${dm.id}/maps/${newId}${ext}`;
		copyFile(m.file, destKey);
		const bytes = m.bytes ?? fs.statSync(path.join(dstStore, destKey)).size;
		setFile.run(destKey, bytes, newId);
		addedBytes += bytes;
		mapsNew++;
	}
	console.log(`maps: +${mapsNew} (of ${maps.length}; ${missing} skipped, file missing)`);
}

if (addedBytes) {
	dst.prepare(`UPDATE users SET storage_bytes = storage_bytes + ? WHERE id = ?`).run(addedBytes, dm.id);
}
console.log(`storage: +${(addedBytes / 1048576).toFixed(1)} MB accounted to DM (user ${dm.id})`);
console.log('done — the world wakes up stocked.');
