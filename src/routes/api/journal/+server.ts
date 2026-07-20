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
