import { db } from '$lib/server/db';

export function load({ locals }) {
	const cast = db
		.prepare(
			'SELECT id, name, title, file, hide_name FROM characters WHERE user_id = ? AND on_canvas = 1 ORDER BY name'
		)
		.all(locals.user!.id)
		.map((c: any) => ({
			id: c.id,
			// Masked server-side so the real name never reaches the player view.
			name: c.hide_name ? '???' : c.name,
			title: c.hide_name ? '' : c.title,
			img: c.file ? `/api/characters/${c.id}` : null
		}));
	return { cast };
}
