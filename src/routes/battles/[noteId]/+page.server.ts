import { error } from '@sveltejs/kit';
import { db } from '$lib/server/db';

export function load({ params, locals }) {
	const uid = locals.user!.id;
	const note = db
		.prepare('SELECT id, title FROM notes WHERE id = ? AND user_id = ?')
		.get(Number(params.noteId), uid) as { id: number; title: string } | undefined;
	if (!note) error(404, 'Session not found');

	const battles = (
		db
			.prepare(
				'SELECT id, title, description, data, created_at, published FROM battles WHERE note_id = ? AND user_id = ? ORDER BY created_at'
			)
			.all(note.id, uid) as {
			id: number;
			title: string;
			description: string;
			data: string;
			created_at: string;
			published: number;
		}[]
	).map((b) => ({
		id: b.id,
		created_at: b.created_at,
		published: !!b.published,
		...JSON.parse(b.data)
	}));

	return { note, battles };
}
