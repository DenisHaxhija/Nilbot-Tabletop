import { error } from '@sveltejs/kit';
import { getSpell } from '$lib/server/db';

export function load({ params, locals }) {
	const row = getSpell(decodeURIComponent(params.slug), locals.user!.id);
	if (!row) error(404, 'Spell not found');
	return { spell: JSON.parse(row.data), source: row.source };
}
