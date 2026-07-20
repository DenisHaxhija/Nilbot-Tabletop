import { json } from '@sveltejs/kit';
import { db } from '$lib/server/db';

export async function POST({ request, locals }) {
	const { name } = await request.json();
	const clean = String(name ?? '').trim();
	if (!clean) return json({ error: 'The group needs a name.' }, { status: 400 });
	const exists = db
		.prepare('SELECT 1 FROM char_groups WHERE user_id = ? AND name = ?')
		.get(locals.user!.id, clean);
	if (!exists) {
		db.prepare('INSERT INTO char_groups (user_id, name) VALUES (?, ?)').run(locals.user!.id, clean);
	}
	return json({ ok: true, name: clean });
}

export async function DELETE({ request, locals }) {
	const { name } = await request.json();
	const clean = String(name ?? '').trim();
	if (!clean) return json({ error: 'No group named.' }, { status: 400 });
	// Characters in the group become ungrouped; the group page disappears.
	db.prepare(`UPDATE characters SET folder = '' WHERE user_id = ? AND folder = ?`).run(
		locals.user!.id,
		clean
	);
	db.prepare('DELETE FROM char_groups WHERE user_id = ? AND name = ?').run(locals.user!.id, clean);
	return json({ ok: true });
}
