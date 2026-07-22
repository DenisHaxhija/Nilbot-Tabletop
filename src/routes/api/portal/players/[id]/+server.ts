import { json, error } from '@sveltejs/kit';
import { db } from '$lib/server/db';

const CONDITIONS = [
	'blinded', 'charmed', 'deafened', 'frightened', 'grappled', 'incapacitated',
	'invisible', 'paralyzed', 'petrified', 'poisoned', 'prone', 'restrained',
	'stunned', 'unconscious', 'exhaustion'
];

const STAT_KEYS = ['str', 'dex', 'con', 'intel', 'wis', 'cha'];

function getRow(id: string, userId: number) {
	return db.prepare('SELECT * FROM pcs WHERE id = ? AND user_id = ?').get(Number(id), userId) as
		| { id: number; gold: number; conditions: string; level: number; items: string; spells: string }
		| undefined;
}

function parseList(raw: string): string[] {
	try {
		const v = JSON.parse(raw);
		return Array.isArray(v) ? v.map(String) : [];
	} catch {
		return [];
	}
}

// One JSON-array column (items or spells) gets an entry added/removed.
function editList(row: { id: number }, raw: string, col: 'items' | 'spells', add?: unknown, removeAt?: unknown) {
	const list = parseList(raw);
	let changed = false;
	if (typeof add === 'string' && add.trim()) {
		list.push(add.trim().slice(0, 120));
		changed = true;
	}
	if (typeof removeAt === 'number' && Number.isInteger(removeAt) && removeAt >= 0 && removeAt < list.length) {
		list.splice(removeAt, 1);
		changed = true;
	}
	if (changed) db.prepare(`UPDATE pcs SET ${col} = ? WHERE id = ?`).run(JSON.stringify(list), row.id);
}

export async function PATCH({ params, request, locals }) {
	const row = getRow(params.id, locals.user!.id);
	if (!row) error(404, 'Player not found');
	const body = await request.json();

	if (typeof body.name === 'string' && body.name.trim()) {
		db.prepare('UPDATE pcs SET name = ? WHERE id = ?').run(body.name.trim().slice(0, 80), row.id);
	}
	if (typeof body.class === 'string') {
		db.prepare('UPDATE pcs SET class = ? WHERE id = ?').run(body.class.trim().slice(0, 40), row.id);
	}
	if (typeof body.backstory === 'string') {
		db.prepare('UPDATE pcs SET backstory = ? WHERE id = ?').run(body.backstory.slice(0, 20000), row.id);
	}

	if (typeof body.goldDelta === 'number' && Number.isFinite(body.goldDelta)) {
		const gold = Math.max(0, row.gold + Math.round(body.goldDelta));
		db.prepare('UPDATE pcs SET gold = ? WHERE id = ?').run(gold, row.id);
	}

	if (typeof body.level === 'number' && Number.isFinite(body.level)) {
		const level = Math.min(20, Math.max(1, Math.round(body.level)));
		db.prepare('UPDATE pcs SET level = ? WHERE id = ?').run(level, row.id);
	}

	// One ability score at a time: { stat: { key: 'dex', value: 16 } }.
	// The column name comes from our whitelist, never from the request.
	const statKey = STAT_KEYS.find((k) => k === body.stat?.key);
	if (statKey && Number.isFinite(Number(body.stat.value))) {
		const value = Math.min(30, Math.max(1, Math.round(Number(body.stat.value))));
		db.prepare(`UPDATE pcs SET ${statKey} = ? WHERE id = ?`).run(value, row.id);
	}

	editList(row, row.items, 'items', body.addItem, body.removeItem);
	editList(row, row.spells, 'spells', body.addSpell, body.removeSpell);

	const current = new Set(row.conditions.split(',').filter(Boolean));
	if (typeof body.addCondition === 'string' && CONDITIONS.includes(body.addCondition)) {
		current.add(body.addCondition);
	}
	if (typeof body.removeCondition === 'string') {
		current.delete(body.removeCondition);
	}
	db.prepare('UPDATE pcs SET conditions = ? WHERE id = ?').run([...current].join(','), row.id);

	const fresh = getRow(params.id, locals.user!.id)!;
	return json({ ok: true, gold: fresh.gold, level: fresh.level, conditions: fresh.conditions });
}
