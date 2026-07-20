import { json, error } from '@sveltejs/kit';
import { db } from '$lib/server/db';

function getRow(id: string, userId: number) {
	return db
		.prepare('SELECT * FROM journal_pages WHERE id = ? AND user_id = ?')
		.get(Number(id), userId) as { id: number } | undefined;
}

export async function PUT({ params, request, locals }) {
	const row = getRow(params.id, locals.user!.id);
	if (!row) error(404, 'Page not found');
	const body = await request.json();
	db.prepare(
		`UPDATE journal_pages SET title = ?, content = ?, section = ?, updated_at = datetime('now') WHERE id = ?`
	).run(
		String(body.title ?? ''),
		String(body.content ?? ''),
		String(body.section ?? '').trim(),
		row.id
	);
	return json({ ok: true });
}

export async function DELETE({ params, locals }) {
	const row = getRow(params.id, locals.user!.id);
	if (row) db.prepare('DELETE FROM journal_pages WHERE id = ?').run(row.id);
	return json({ ok: true });
}
