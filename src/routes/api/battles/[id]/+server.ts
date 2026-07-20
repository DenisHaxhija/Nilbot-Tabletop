import { json } from '@sveltejs/kit';
import { db } from '$lib/server/db';

export async function DELETE({ params, locals }) {
	db.prepare('DELETE FROM battles WHERE id = ? AND user_id = ?').run(
		Number(params.id),
		locals.user!.id
	);
	return json({ ok: true });
}
