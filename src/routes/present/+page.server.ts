import { db } from '$lib/server/db';

export function load({ locals }) {
	const battles = db
		.prepare(
			`SELECT b.id, b.note_id, b.title, b.data, b.map IS NOT NULL AS has_map, n.title AS session_title
			 FROM battles b JOIN notes n ON n.id = b.note_id
			 WHERE b.user_id = ? AND b.published = 1 ORDER BY b.created_at DESC`
		)
		.all(locals.user!.id)
		.map((r: any) => {
			const enc = JSON.parse(r.data);
			return {
				id: r.id,
				noteId: r.note_id,
				title: r.title,
				sessionTitle: r.session_title,
				difficulty: enc.difficulty ?? null,
				environment: enc.environment ?? null,
				hasMap: !!r.has_map
			};
		});
	return { battles };
}
