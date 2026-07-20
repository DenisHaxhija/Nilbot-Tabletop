import { json } from '@sveltejs/kit';
import { db } from '$lib/server/db';

export async function POST({ request, locals }) {
	const uid = locals.user!.id;
	const { itemId, on, price } = await request.json();
	const item = db
		.prepare(`SELECT id FROM items WHERE id = ? AND (user_id IS NULL OR user_id = ?)`)
		.get(Number(itemId), uid);
	if (!item) return json({ error: 'Item not found.' }, { status: 404 });

	if (on === false) {
		db.prepare('DELETE FROM shop_stock WHERE user_id = ? AND item_id = ?').run(uid, Number(itemId));
	} else {
		db.prepare(
			`INSERT INTO shop_stock (user_id, item_id, price) VALUES (?, ?, ?)
			 ON CONFLICT(user_id, item_id) DO UPDATE SET price = excluded.price`
		).run(uid, Number(itemId), String(price ?? ''));
	}
	return json({ ok: true });
}
