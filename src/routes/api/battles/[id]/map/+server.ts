import { json } from '@sveltejs/kit';
import { db } from '$lib/server/db';

export async function GET({ params, locals }) {
	const row = db
		.prepare('SELECT map FROM battles WHERE id = ? AND user_id = ?')
		.get(Number(params.id), locals.user!.id) as { map: string | null } | undefined;
	if (!row) return json({ error: 'Battle not found' }, { status: 404 });
	return json(
		{ map: row.map ? JSON.parse(row.map) : null },
		{ headers: { 'Cache-Control': 'no-store' } }
	);
}

export async function PUT({ params, request, locals }) {
	const map = await request.json();
	db.prepare('UPDATE battles SET map = ? WHERE id = ? AND user_id = ?').run(
		JSON.stringify(map),
		Number(params.id),
		locals.user!.id
	);
	return json({ ok: true });
}
