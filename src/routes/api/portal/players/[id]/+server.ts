import { json, error } from '@sveltejs/kit';
import { db } from '$lib/server/db';

const CONDITIONS = [
	'blinded', 'charmed', 'deafened', 'frightened', 'grappled', 'incapacitated',
	'invisible', 'paralyzed', 'petrified', 'poisoned', 'prone', 'restrained',
	'stunned', 'unconscious', 'exhaustion'
];

function getRow(id: string, userId: number) {
	return db.prepare('SELECT * FROM pcs WHERE id = ? AND user_id = ?').get(Number(id), userId) as
		| { id: number; gold: number; conditions: string }
		| undefined;
}

export async function PATCH({ params, request, locals }) {
	const row = getRow(params.id, locals.user!.id);
	if (!row) error(404, 'Player not found');
	const body = await request.json();

	if (typeof body.goldDelta === 'number' && Number.isFinite(body.goldDelta)) {
		const gold = Math.max(0, row.gold + Math.round(body.goldDelta));
		db.prepare('UPDATE pcs SET gold = ? WHERE id = ?').run(gold, row.id);
	}

	const current = new Set(row.conditions.split(',').filter(Boolean));
	if (typeof body.addCondition === 'string' && CONDITIONS.includes(body.addCondition)) {
		current.add(body.addCondition);
	}
	if (typeof body.removeCondition === 'string') {
		current.delete(body.removeCondition);
	}
	db.prepare('UPDATE pcs SET conditions = ? WHERE id = ?').run([...current].join(','), row.id);

	const fresh = getRow(params.id, locals.user!.id)!;
	return json({ ok: true, gold: fresh.gold, conditions: fresh.conditions });
}
