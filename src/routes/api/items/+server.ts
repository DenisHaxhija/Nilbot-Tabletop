import { json } from '@sveltejs/kit';
import { db } from '$lib/server/db';

export async function POST({ request, locals }) {
	const { name, type, rarity, attunement, desc } = await request.json();
	const clean = String(name ?? '').trim();
	if (!clean) return json({ error: 'The item needs a name.' }, { status: 400 });
	const info = db
		.prepare(
			`INSERT INTO items (slug, name, type, rarity, attunement, desc, source, layer, user_id)
			 VALUES (NULL, ?, ?, ?, ?, ?, 'Custom', 'user', ?)`
		)
		.run(
			clean,
			String(type ?? '').trim() || null,
			String(rarity ?? '').trim() || null,
			String(attunement ?? '').trim(),
			String(desc ?? ''),
			locals.user!.id
		);
	return json({ ok: true, id: info.lastInsertRowid });
}
