import { error } from '@sveltejs/kit';
import { db } from '$lib/server/db';

export function load({ params, locals }) {
	const map = db
		.prepare('SELECT id, name FROM maps WHERE id = ? AND user_id = ?')
		.get(Number(params.id), locals.user!.id) as { id: number; name: string } | undefined;
	if (!map) error(404, 'Map not found');
	return { map };
}
