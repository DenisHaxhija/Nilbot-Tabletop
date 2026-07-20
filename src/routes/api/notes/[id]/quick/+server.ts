import { json } from '@sveltejs/kit';
import { db } from '$lib/server/db';

export async function POST({ params, request, locals }) {
	const uid = locals.user!.id;
	const noteId = Number(params.id);
	const owned = db.prepare('SELECT 1 FROM notes WHERE id = ? AND user_id = ?').get(noteId, uid);
	if (!owned) return json({ error: 'Session not found.' }, { status: 404 });

	const { content } = await request.json();
	const clean = String(content ?? '').trim();
	if (!clean) return json({ error: 'Empty note.' }, { status: 400 });

	const info = db
		.prepare('INSERT INTO quick_notes (note_id, user_id, content) VALUES (?, ?, ?)')
		.run(noteId, uid, clean);
	return json({ ok: true, id: info.lastInsertRowid });
}

export async function DELETE({ params, request, locals }) {
	const { quickId } = await request.json();
	db.prepare('DELETE FROM quick_notes WHERE id = ? AND note_id = ? AND user_id = ?').run(
		Number(quickId),
		Number(params.id),
		locals.user!.id
	);
	return json({ ok: true });
}
