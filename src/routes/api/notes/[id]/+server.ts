import { json } from '@sveltejs/kit';
import { db } from '$lib/server/db';

export async function PUT({ params, request, locals }) {
	const { title, content } = await request.json();
	db.prepare(
		`UPDATE notes SET title = ?, content = ?, updated_at = datetime('now') WHERE id = ? AND user_id = ?`
	).run(String(title ?? 'Untitled'), String(content ?? ''), Number(params.id), locals.user!.id);
	return json({ ok: true });
}
