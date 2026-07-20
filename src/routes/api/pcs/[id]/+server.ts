import { json, error } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { imageResponse, deleteObject, addUsage } from '$lib/server/storage';

function getRow(id: string, userId: number) {
	return db.prepare('SELECT * FROM pcs WHERE id = ? AND user_id = ?').get(Number(id), userId) as
		| { id: number; name: string; file: string | null; bytes: number | null; user_id: number }
		| undefined;
}

export async function GET({ params, locals }) {
	const row = getRow(params.id, locals.user!.id);
	const res = await imageResponse(row?.file);
	if (!res) error(404, 'No portrait');
	return res;
}

export async function DELETE({ params, locals }) {
	const row = getRow(params.id, locals.user!.id);
	if (row) {
		if (row.file) {
			await deleteObject(row.file);
			addUsage(row.user_id, -(row.bytes ?? 0));
		}
		db.prepare('DELETE FROM pcs WHERE id = ?').run(row.id);
	}
	return json({ ok: true });
}
