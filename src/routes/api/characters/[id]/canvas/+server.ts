import { json } from '@sveltejs/kit';
import { db } from '$lib/server/db';

export async function POST({ params, request, locals }) {
	const { on } = await request.json();
	db.prepare('UPDATE characters SET on_canvas = ? WHERE id = ? AND user_id = ?').run(
		on ? 1 : 0,
		Number(params.id),
		locals.user!.id
	);
	return json({ ok: true });
}
