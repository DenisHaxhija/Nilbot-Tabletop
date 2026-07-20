import { json, error } from '@sveltejs/kit';
import { db } from '$lib/server/db';

function getRow(id: string, userId: number) {
	return db
		.prepare('SELECT * FROM journal_pages WHERE id = ? AND user_id = ?')
		.get(Number(id), userId) as { id: number; parent_id: number | null } | undefined;
}

// Partial update: only the fields present in the body change, so indent /
// promote operations don't clobber the page text.
export async function PUT({ params, request, locals }) {
	const uid = locals.user!.id;
	const row = getRow(params.id, uid);
	if (!row) error(404, 'Page not found');
	const body = await request.json();

	const sets: string[] = [];
	const vals: unknown[] = [];
	if ('title' in body) {
		sets.push('title = ?');
		vals.push(String(body.title ?? ''));
	}
	if ('content' in body) {
		sets.push('content = ?');
		vals.push(String(body.content ?? ''));
	}
	if ('section' in body) {
		sets.push('section = ?');
		vals.push(String(body.section ?? '').trim());
		// Moving to another section breaks any subpage relationship.
		sets.push('parent_id = NULL');
	}
	if ('parent_id' in body) {
		let pid: number | null = null;
		if (body.parent_id !== null) {
			const parent = db
				.prepare(
					'SELECT id FROM journal_pages WHERE id = ? AND user_id = ? AND parent_id IS NULL'
				)
				.get(Number(body.parent_id), uid) as { id: number } | undefined;
			if (!parent || parent.id === row.id) return json({ error: 'Bad parent.' }, { status: 400 });
			pid = parent.id;
		}
		sets.push('parent_id = ?');
		vals.push(pid);
	}
	if (sets.length === 0) return json({ ok: true });
	sets.push(`updated_at = datetime('now')`);
	db.prepare(`UPDATE journal_pages SET ${sets.join(', ')} WHERE id = ?`).run(...vals, row.id);
	return json({ ok: true });
}

export async function DELETE({ params, locals }) {
	const row = getRow(params.id, locals.user!.id);
	if (row) {
		// Subpages survive their parent — they promote to top level.
		db.prepare('UPDATE journal_pages SET parent_id = NULL WHERE parent_id = ?').run(row.id);
		db.prepare('DELETE FROM journal_pages WHERE id = ?').run(row.id);
	}
	return json({ ok: true });
}
