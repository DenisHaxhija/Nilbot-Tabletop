import { db } from '$lib/server/db';

export function load({ locals }) {
	const cast = db
		.prepare(
			'SELECT id, name, title, file FROM characters WHERE user_id = ? AND on_canvas = 1 ORDER BY name'
		)
		.all(locals.user!.id)
		.map((c: any) => ({
			id: c.id,
			name: c.name,
			title: c.title,
			img: c.file ? `/api/characters/${c.id}` : null
		}));
	return { cast };
}
