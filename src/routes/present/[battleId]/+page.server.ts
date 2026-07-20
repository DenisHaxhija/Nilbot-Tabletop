import { error } from '@sveltejs/kit';
import { db } from '$lib/server/db';

export function load({ params, locals }) {
	const battle = db
		.prepare('SELECT id, title, map FROM battles WHERE id = ? AND user_id = ?')
		.get(Number(params.battleId), locals.user!.id) as
		| { id: number; title: string; map: string | null }
		| undefined;
	if (!battle) error(404, 'Battle not found');
	const map = battle.map ? JSON.parse(battle.map) : null;
	if (!map?.mapId) error(404, 'This battle has no map yet — set one up in the Battles tab first.');
	return { battle: { id: battle.id, title: battle.title }, map };
}
