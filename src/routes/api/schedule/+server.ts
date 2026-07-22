import { json } from '@sveltejs/kit';
import { db } from '$lib/server/db';

export async function POST({ request, locals }) {
	const body = await request.json();
	const title = String(body.title ?? '').trim() || 'Session';
	const at = String(body.at ?? '').trim();
	const note = String(body.note ?? '').trim();
	if (!at || isNaN(Date.parse(at))) {
		return json({ error: 'Pick a date and time.' }, { status: 400 });
	}
	const info = db
		.prepare('INSERT INTO schedule_events (user_id, title, at, note) VALUES (?, ?, ?, ?)')
		.run(locals.user!.id, title, new Date(at).toISOString(), note);
	return json({ ok: true, id: info.lastInsertRowid });
}

export async function DELETE({ request, locals }) {
	const { id } = await request.json();
	db.prepare('DELETE FROM schedule_events WHERE id = ? AND user_id = ?').run(
		Number(id),
		locals.user!.id
	);
	return json({ ok: true });
}
