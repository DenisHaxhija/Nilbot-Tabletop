import { json } from '@sveltejs/kit';
import { db } from '$lib/server/db';

export async function POST({ request, locals }) {
	const uid = locals.user!.id;
	const { noteId, encounter } = await request.json();
	const note = db
		.prepare('SELECT id FROM notes WHERE id = ? AND user_id = ?')
		.get(Number(noteId), uid);
	if (!note || !encounter) {
		return json({ error: 'Invalid session or encounter.' }, { status: 400 });
	}
	const info = db
		.prepare(`INSERT INTO battles (note_id, title, description, data, user_id) VALUES (?, ?, ?, ?, ?)`)
		.run(
			Number(noteId),
			String(encounter.title ?? 'Battle'),
			String(encounter.description ?? ''),
			JSON.stringify(encounter),
			uid
		);
	return json({ ok: true, id: info.lastInsertRowid });
}
