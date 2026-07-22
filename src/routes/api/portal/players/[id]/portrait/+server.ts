import { json, error } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { storeUserImage, deleteObject, addUsage, QuotaError } from '$lib/server/storage';

// Replace a player character's portrait. The old file is removed first so
// byte accounting stays honest on every path.
export async function POST({ params, request, locals }) {
	const uid = locals.user!.id;
	const row = db
		.prepare('SELECT id, file, bytes FROM pcs WHERE id = ? AND user_id = ?')
		.get(Number(params.id), uid) as { id: number; file: string | null; bytes: number | null } | undefined;
	if (!row) error(404, 'Player not found');

	const form = await request.formData();
	const file = form.get('file');
	if (!(file instanceof File) || file.size === 0) {
		return json({ error: 'No image supplied.' }, { status: 400 });
	}

	if (row.file) {
		await deleteObject(row.file);
		addUsage(uid, -(row.bytes ?? 0));
		db.prepare('UPDATE pcs SET file = NULL, bytes = NULL WHERE id = ?').run(row.id);
	}

	try {
		const stored = await storeUserImage(uid, 'pcs', row.id, file);
		if (stored) {
			db.prepare('UPDATE pcs SET file = ?, bytes = ? WHERE id = ?').run(stored.key, stored.bytes, row.id);
		}
	} catch (e) {
		if (e instanceof QuotaError) return json({ error: e.message }, { status: 413 });
		throw e;
	}
	return json({ ok: true });
}
