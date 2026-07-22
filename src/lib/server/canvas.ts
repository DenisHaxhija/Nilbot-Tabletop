import { db } from '$lib/server/db';

// The canvas cast as a player may see it: hidden names masked server-side,
// images routed through the seat-safe endpoint. `ownerId` is the DM whose
// stage it is; `imgBase` differs between the DM's present view and the seat.
export function canvasCast(ownerId: number, imgBase: string) {
	return (
		db
			.prepare(
				'SELECT id, name, title, file, hide_name FROM characters WHERE user_id = ? AND on_canvas = 1 ORDER BY name'
			)
			.all(ownerId) as {
			id: number;
			name: string;
			title: string;
			file: string | null;
			hide_name: number;
		}[]
	).map((c) => ({
		id: c.id,
		name: c.hide_name ? '???' : c.name,
		title: c.hide_name ? '' : c.title,
		img: c.file ? `${imgBase}/${c.id}` : null
	}));
}
