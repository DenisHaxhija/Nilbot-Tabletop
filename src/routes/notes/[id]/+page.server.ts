import { error } from '@sveltejs/kit';
import { db, getSetting } from '$lib/server/db';

export function load({ params, locals }) {
	const uid = locals.user!.id;
	const note = db
		.prepare('SELECT * FROM notes WHERE id = ? AND user_id = ?')
		.get(Number(params.id), uid) as
		| { id: number; title: string; content: string; updated_at: string }
		| undefined;
	if (!note) error(404, 'Note not found');
	const quickNotes = db
		.prepare(
			'SELECT id, content, created_at FROM quick_notes WHERE note_id = ? AND user_id = ? ORDER BY created_at DESC, id DESC'
		)
		.all(note.id, uid) as { id: number; content: string; created_at: string }[];
	return {
		note,
		quickNotes,
		partyDefaults: {
			level: Number(getSetting(uid, 'party_level', '3')),
			size: Number(getSetting(uid, 'party_size', '4'))
		}
	};
}
