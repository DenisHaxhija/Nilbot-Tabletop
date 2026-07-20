import { error } from '@sveltejs/kit';
import { db } from '$lib/server/db';

export function load({ params, locals }) {
	const c = db
		.prepare('SELECT id, name, title, description, file FROM characters WHERE id = ? AND user_id = ?')
		.get(Number(params.id), locals.user!.id) as
		| { id: number; name: string; title: string; description: string; file: string | null }
		| undefined;
	if (!c) error(404, 'Character not found');
	return {
		character: {
			id: c.id,
			name: c.name,
			title: c.title,
			description: c.description,
			img: c.file ? `/api/characters/${c.id}` : null
		}
	};
}
