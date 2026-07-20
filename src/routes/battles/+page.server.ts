import { db } from '$lib/server/db';

export function load({ locals }) {
	const sessions = db
		.prepare(
			`SELECT n.id, n.title, count(b.id) AS battles, max(b.created_at) AS last_added
			 FROM battles b JOIN notes n ON n.id = b.note_id
			 WHERE b.user_id = ?
			 GROUP BY n.id ORDER BY last_added DESC`
		)
		.all(locals.user!.id) as { id: number; title: string; battles: number; last_added: string }[];
	return { sessions };
}
