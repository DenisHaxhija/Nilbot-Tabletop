import { json } from '@sveltejs/kit';
import { db } from '$lib/server/db';

export async function DELETE({ params, locals }) {
	// Only user-created items can be deleted; the shared catalog is read-only.
	db.prepare('DELETE FROM shop_stock WHERE item_id = ? AND user_id = ?').run(
		Number(params.id),
		locals.user!.id
	);
	db.prepare('DELETE FROM items WHERE id = ? AND user_id = ?').run(
		Number(params.id),
		locals.user!.id
	);
	return json({ ok: true });
}
