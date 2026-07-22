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

// --- personal layer: the operator's own campaign data → the world DM ---
// Characters (with portraits), groups, session notes, battles, journal,
// party PCs, songs, shop stock. IDs are remapped where rows point at each
// other (battles → notes/maps/pcs, journal parent pages, shop → items).

const srcUser = Number(arg('--from-user', '1'));
if (!process.argv.includes('--no-personal')) {
	// character groups — folders are referenced by name, so no remap
	const haveGroup = new Set(
		dst.prepare(`SELECT name FROM char_groups WHERE user_id = ?`).all(dm.id).map((r) => r.name)
	);
	let gNew = 0;
	for (const g of src.prepare(`SELECT * FROM char_groups WHERE user_id = ?`).all(srcUser)) {
		if (haveGroup.has(g.name)) continue;
		dst.prepare(
			`INSERT INTO char_groups (user_id, name, created_at, hidden) VALUES (?, ?, ?, ?)`
		).run(dm.id, g.name, g.created_at, g.hidden ?? 0);
		gNew++;
	}

	// characters + portraits
	const haveChar = new Set(
		dst.prepare(`SELECT name FROM characters WHERE user_id = ?`).all(dm.id).map((r) => r.name)
	);
	let cNew = 0;
	for (const c of src.prepare(`SELECT * FROM characters WHERE user_id = ?`).all(srcUser)) {
		if (haveChar.has(c.name)) continue;
		const info = dst.prepare(
			`INSERT INTO characters (user_id, name, title, description, notes, file, created_at,
			                         on_canvas, folder, bytes, sheet_slug, hide_name)
			 VALUES (?, ?, ?, ?, ?, NULL, ?, ?, ?, NULL, ?, ?)`
		).run(
			dm.id, c.name, c.title ?? '', c.description ?? '', c.notes ?? '', c.created_at,
			c.on_canvas ?? 0, c.folder ?? '', c.sheet_slug, c.hide_name ?? 0
		);
		if (c.file) {
			const ext = path.extname(c.file) || '.webp';
			const destKey = `u${dm.id}/characters/${info.lastInsertRowid}${ext}`;
			if (copyFile(c.file, destKey)) {
				dst.prepare(`UPDATE characters SET file = ?, bytes = ? WHERE id = ?`).run(
					destKey, c.bytes ?? 0, info.lastInsertRowid
				);
				addedBytes += c.bytes ?? 0;
			}
		}
		cNew++;
	}
	console.log(`characters: +${cNew}, groups: +${gNew}`);

	// party pcs + portraits — remembered for battle-token remapping
	const pcIdMap = new Map();
	let pNew = 0;
	for (const p of src.prepare(`SELECT * FROM pcs WHERE user_id = ?`).all(srcUser)) {
		const existing = dst
			.prepare(`SELECT id FROM pcs WHERE user_id = ? AND name = ? COLLATE NOCASE`)
			.get(dm.id, p.name);
		if (existing) {
			pcIdMap.set(p.id, existing.id);
			continue;
		}
		const info = dst.prepare(
			`INSERT INTO pcs (user_id, name, class, file, created_at, bytes, sheet_slug)
			 VALUES (?, ?, ?, NULL, ?, NULL, ?)`
		).run(dm.id, p.name, p.class ?? '', p.created_at, p.sheet_slug);
		pcIdMap.set(p.id, Number(info.lastInsertRowid));
		if (p.file) {
			const ext = path.extname(p.file) || '.webp';
			const destKey = `u${dm.id}/pcs/${info.lastInsertRowid}${ext}`;
			if (copyFile(p.file, destKey)) {
				dst.prepare(`UPDATE pcs SET file = ?, bytes = ? WHERE id = ?`).run(
					destKey, p.bytes ?? 0, info.lastInsertRowid
				);
				addedBytes += p.bytes ?? 0;
			}
		}
		pNew++;
	}
	console.log(`party pcs: +${pNew}`);

	// notes (sessions/chronicles) — id map feeds battles and quick notes
	const noteIdMap = new Map();
	let nNew = 0;
	for (const n of src.prepare(`SELECT * FROM notes WHERE user_id = ?`).all(srcUser)) {
		const existing = dst
			.prepare(`SELECT id FROM notes WHERE user_id = ? AND title = ? AND created_at = ?`)
			.get(dm.id, n.title, n.created_at);
		if (existing) {
			noteIdMap.set(n.id, existing.id);
			continue;
		}
		const info = dst.prepare(
			`INSERT INTO notes (title, content, created_at, updated_at, user_id, src)
			 VALUES (?, ?, ?, ?, ?, ?)`
		).run(n.title, n.content, n.created_at, n.updated_at, dm.id, n.src);
		noteIdMap.set(n.id, Number(info.lastInsertRowid));
		nNew++;
	}
	console.log(`notes: +${nNew}`);

	// quick notes ride their note
	let qNew = 0;
	for (const q of src.prepare(`SELECT * FROM quick_notes WHERE user_id = ?`).all(srcUser)) {
		const noteId = noteIdMap.get(q.note_id);
		if (!noteId) continue;
		const dup = dst
			.prepare(`SELECT 1 FROM quick_notes WHERE user_id = ? AND note_id = ? AND content = ?`)
			.get(dm.id, noteId, q.content);
		if (dup) continue;
		dst.prepare(
			`INSERT INTO quick_notes (note_id, user_id, content, created_at) VALUES (?, ?, ?, ?)`
		).run(noteId, dm.id, q.content, q.created_at);
		qNew++;
	}

	// journal pages — two passes so parent links survive the id change
	const jIdMap = new Map();
	let jNew = 0;
	const jPages = src.prepare(`SELECT * FROM journal_pages WHERE user_id = ?`).all(srcUser);
	for (const j of jPages) {
		const existing = dst
			.prepare(`SELECT id FROM journal_pages WHERE user_id = ? AND title = ? AND section = ?`)
			.get(dm.id, j.title, j.section);
		if (existing) {
			jIdMap.set(j.id, existing.id);
			continue;
		}
		const info = dst.prepare(
			`INSERT INTO journal_pages (user_id, title, section, content, created_at, updated_at, parent_id)
			 VALUES (?, ?, ?, ?, ?, ?, NULL)`
		).run(dm.id, j.title, j.section, j.content, j.created_at, j.updated_at);
		jIdMap.set(j.id, Number(info.lastInsertRowid));
		jNew++;
	}
	for (const j of jPages) {
		if (j.parent_id && jIdMap.has(j.id) && jIdMap.has(j.parent_id)) {
			dst.prepare(`UPDATE journal_pages SET parent_id = ? WHERE id = ? AND parent_id IS NULL`).run(
				jIdMap.get(j.parent_id), jIdMap.get(j.id)
			);
		}
	}
	console.log(`journal pages: +${jNew}, quick notes: +${qNew}`);

	// battle-map id map: source map id → world map id (matched by src/name)
	const mapIdMap = new Map();
	for (const m of src.prepare(`SELECT id, src, name FROM maps`).all()) {
		const hit = m.src
			? dst.prepare(`SELECT id FROM maps WHERE src = ?`).get(m.src)
			: dst.prepare(`SELECT id FROM maps WHERE name = ?`).get(m.name);
		if (hit) mapIdMap.set(m.id, hit.id);
	}

	// battles — note, map and pc-token references all remapped
	let bNew = 0;
	for (const b of src.prepare(`SELECT * FROM battles WHERE user_id = ?`).all(srcUser)) {
		const existing = dst
			.prepare(`SELECT 1 FROM battles WHERE user_id = ? AND title = ? AND created_at = ?`)
			.get(dm.id, b.title, b.created_at);
		if (existing) continue;
		let mapJson = b.map;
		if (mapJson) {
			try {
				const m = JSON.parse(mapJson);
				if (m.mapId && mapIdMap.has(m.mapId)) m.mapId = mapIdMap.get(m.mapId);
				for (const t of m.tokens ?? []) {
					const pcRef = /^\/api\/pcs\/(\d+)$/.exec(t.img ?? '');
					if (pcRef && pcIdMap.has(Number(pcRef[1]))) {
						t.img = `/api/pcs/${pcIdMap.get(Number(pcRef[1]))}`;
					}
				}
				mapJson = JSON.stringify(m);
			} catch {
				// unparseable payload — carried as-is
			}
		}
		dst.prepare(
			`INSERT INTO battles (note_id, title, description, data, created_at, map, user_id, published)
			 VALUES (?, ?, ?, ?, ?, ?, ?, 0)`
		).run(noteIdMap.get(b.note_id) ?? 0, b.title, b.description ?? '', b.data, b.created_at, mapJson, dm.id);
		bNew++;
	}
	console.log(`battles: +${bNew}`);

	// songs (+ audio files when stored locally)
	let soNew = 0;
	for (const s of src.prepare(`SELECT * FROM songs WHERE user_id = ?`).all(srcUser)) {
		const dup = dst
			.prepare(`SELECT 1 FROM songs WHERE user_id = ? AND name = ? AND grp = ?`)
			.get(dm.id, s.name, s.grp ?? '');
		if (dup) continue;
		const info = dst.prepare(
			`INSERT INTO songs (user_id, name, grp, url, file, created_at, bytes)
			 VALUES (?, ?, ?, ?, NULL, ?, NULL)`
		).run(dm.id, s.name, s.grp ?? '', s.url, s.created_at);
		if (s.file) {
			const ext = path.extname(s.file) || '.mp3';
			const destKey = `u${dm.id}/music/${info.lastInsertRowid}${ext}`;
			if (copyFile(s.file, destKey)) {
				dst.prepare(`UPDATE songs SET file = ?, bytes = ? WHERE id = ?`).run(
					destKey, s.bytes ?? 0, info.lastInsertRowid
				);
				addedBytes += s.bytes ?? 0;
			}
		}
		soNew++;
	}

	// shop stock — item ids cross the bridge by slug
	let stNew = 0;
	for (const st of src.prepare(`SELECT * FROM shop_stock WHERE user_id = ?`).all(srcUser)) {
		const slug = src.prepare(`SELECT slug FROM items WHERE id = ?`).get(st.item_id)?.slug;
		if (!slug) continue;
		const target = dst.prepare(`SELECT id FROM items WHERE slug = ?`).get(slug);
		if (!target) continue;
		const dup = dst
			.prepare(`SELECT 1 FROM shop_stock WHERE user_id = ? AND item_id = ?`)
			.get(dm.id, target.id);
		if (dup) continue;
		const cols = Object.keys(st).filter((k) => !['user_id', 'item_id'].includes(k));
		dst.prepare(
			`INSERT INTO shop_stock (user_id, item_id${cols.map((c) => `, ${c}`).join('')})
			 VALUES (?, ?${cols.map(() => ', ?').join('')})`
		).run(dm.id, target.id, ...cols.map((c) => st[c]));
		stNew++;
	}
	console.log(`songs: +${soNew}, shop stock: +${stNew}`);
}

if (addedBytes) {
	dst.prepare(`UPDATE users SET storage_bytes = storage_bytes + ? WHERE id = ?`).run(addedBytes, dm.id);
}
console.log(`storage: +${(addedBytes / 1048576).toFixed(1)} MB accounted to DM (user ${dm.id})`);
console.log('done — the world wakes up stocked.');
