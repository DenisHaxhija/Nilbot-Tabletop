import { error } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { tokenCells } from '$lib/token';

export function load({ params, locals }) {
	const uid = locals.user!.id;
	const battle = db
		.prepare('SELECT * FROM battles WHERE id = ? AND note_id = ? AND user_id = ?')
		.get(Number(params.battleId), Number(params.noteId), uid) as
		| { id: number; note_id: number; title: string; data: string; map: string | null }
		| undefined;
	if (!battle) error(404, 'Battle not found');

	const note = db.prepare('SELECT id, title FROM notes WHERE id = ?').get(battle.note_id) as {
		id: number;
		title: string;
	};
	const enc = JSON.parse(battle.data);

	// Existing map layout (only if it's the imported-image kind and the map still exists)
	let layout = battle.map ? JSON.parse(battle.map) : null;
	if (layout && !layout.mapId) layout = null; // discard old generated-map format
	if (
		layout &&
		!db
			.prepare('SELECT id FROM maps WHERE id = ? AND (user_id IS NULL OR user_id = ?)')
			.get(layout.mapId, uid)
	)
		layout = null;

	const tokenImg = (slug: string | null | undefined) => {
		if (!slug) return null;
		const row = db
			.prepare('SELECT token FROM monsters WHERE slug = ? AND (user_id IS NULL OR user_id = ?)')
			.get(slug, uid) as { token: string | null } | undefined;
		return row?.token ? `/api/token/${encodeURIComponent(slug)}` : null;
	};
	// Combat stats (max HP + DEX-based initiative bonus) from the stat block.
	const combatStats = (slug: string | null | undefined) => {
		if (!slug) return { maxHp: null as number | null, initMod: 0 };
		const row = db
			.prepare('SELECT hp, data FROM monsters WHERE slug = ? AND (user_id IS NULL OR user_id = ?)')
			.get(slug, uid) as { hp: number | null; data: string } | undefined;
		if (!row) return { maxHp: null, initMod: 0 };
		let initMod = 0;
		try {
			const d = JSON.parse(row.data);
			const dex = d.dexterity ?? d.dex;
			if (typeof dex === 'number') initMod = Math.floor((dex - 10) / 2);
		} catch {
			// keep default
		}
		return { maxHp: row.hp, initMod };
	};

	if (layout?.tokens) {
		for (const t of layout.tokens) {
			t.img = t.kind === 'pc' ? (t.img ?? null) : tokenImg(t.slug);
			// Backfill combat fields onto layouts saved before the encounter tracker existed.
			if (t.maxHp === undefined) {
				const stats = t.kind === 'monster' ? combatStats(t.slug) : { maxHp: null, initMod: 0 };
				t.maxHp = stats.maxHp;
				t.hp = stats.maxHp;
				t.initMod = stats.initMod;
				t.init = null;
				t.dead = false;
			}
		}
		layout.encounter ??= { round: 1, activeId: null };
	}

	// Template tokens for first-time placement: enemies + party lined up at the bottom.
	const template: unknown[] = [];
	let idx = 0;
	for (const c of enc.creatures ?? []) {
		let type: string | null = null;
		let cells = 1;
		if (c.slug) {
			const row = db
				.prepare('SELECT type, size FROM monsters WHERE slug = ? AND (user_id IS NULL OR user_id = ?)')
				.get(c.slug, uid) as { type: string | null; size: string | null } | undefined;
			if (row) {
				type = row.type;
				cells = tokenCells(row.size);
			}
		}
		const stats = combatStats(c.slug);
		for (let i = 0; i < (c.count ?? 1); i++) {
			template.push({
				id: `m${idx++}`,
				kind: 'monster',
				label: (c.count ?? 1) > 1 ? String(i + 1) : '',
				name: c.name ?? c.requested ?? 'Monster',
				slug: c.slug ?? null,
				type,
				cells,
				img: tokenImg(c.slug),
				maxHp: stats.maxHp,
				hp: stats.maxHp,
				initMod: stats.initMod,
				init: null,
				dead: false
			});
		}
	}
	// Real party members when they exist; generic P1..Pn otherwise.
	const pcs = db
		.prepare('SELECT id, name, file FROM pcs WHERE user_id = ? ORDER BY created_at')
		.all(uid) as { id: number; name: string; file: string | null }[];
	const pcExtras = { maxHp: null, hp: null, initMod: 0, init: null, dead: false };
	if (pcs.length > 0) {
		for (const pc of pcs) {
			template.push({
				id: `pc${pc.id}`,
				kind: 'pc',
				label: '',
				name: pc.name,
				slug: null,
				type: null,
				cells: 1,
				img: pc.file ? `/api/pcs/${pc.id}` : null,
				...pcExtras
			});
		}
	} else {
		const partySize = Number(enc.partySize) || 4;
		for (let i = 0; i < partySize; i++) {
			template.push({
				id: `p${i}`,
				kind: 'pc',
				label: `P${i + 1}`,
				name: `Player ${i + 1}`,
				slug: null,
				type: null,
				cells: 1,
				img: null,
				...pcExtras
			});
		}
	}

	const maps = db
		.prepare(
			`SELECT id, name, tags FROM maps WHERE (user_id IS NULL OR user_id = ?) AND kind = 'battle' ORDER BY created_at DESC`
		)
		.all(uid) as { id: number; name: string; tags: string }[];

	return {
		battle: { id: battle.id, title: battle.title },
		note,
		environment: enc.environment ?? null,
		layout,
		template,
		maps
	};
}
