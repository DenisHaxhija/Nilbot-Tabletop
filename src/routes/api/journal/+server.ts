import { json } from '@sveltejs/kit';
import { db } from '$lib/server/db';

export async function POST({ request, locals }) {
	const body = await request.json();
	const title = String(body.title ?? '').trim();
	const section = String(body.section ?? '').trim();
	const info = db
		.prepare('INSERT INTO journal_pages (user_id, title, section) VALUES (?, ?, ?)')
		.run(locals.user!.id, title, section);
	return json({ ok: true, id: info.lastInsertRowid });
}

// Rename a section (all its pages move with it).
export async function PATCH({ request, locals }) {
	const { from, to } = await request.json();
	const clean = String(to ?? '').trim();
	if (typeof from !== 'string' || !clean) {
		return json({ error: 'Section name required.' }, { status: 400 });
	}
	db.prepare('UPDATE journal_pages SET section = ? WHERE user_id = ? AND section = ?').run(
		clean,
		locals.user!.id,
		from
	);
	return json({ ok: true });
}

// Delete a section and every page in it.
export async function DELETE({ request, locals }) {
	const { section } = await request.json();
	if (typeof section !== 'string') return json({ error: 'No section named.' }, { status: 400 });
	db.prepare('DELETE FROM journal_pages WHERE user_id = ? AND section = ?').run(
		locals.user!.id,
		section
	);
	return json({ ok: true });
}
