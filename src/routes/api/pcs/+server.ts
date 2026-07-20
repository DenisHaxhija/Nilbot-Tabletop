import { json } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { storeUserImage, QuotaError } from '$lib/server/storage';

export async function POST({ request, locals }) {
	const uid = locals.user!.id;
	const form = await request.formData();
	const name = String(form.get('name') ?? '').trim();
	const klass = String(form.get('class') ?? '').trim();
	if (!name) return json({ error: 'The character needs a name.' }, { status: 400 });

	const info = db
		.prepare('INSERT INTO pcs (user_id, name, class) VALUES (?, ?, ?)')
		.run(uid, name, klass);

	const file = form.get('file');
	if (file instanceof File && file.size > 0) {
		try {
			const stored = await storeUserImage(uid, 'pcs', info.lastInsertRowid, file);
			if (stored) {
				db.prepare('UPDATE pcs SET file = ?, bytes = ? WHERE id = ?').run(
					stored.key,
					stored.bytes,
					info.lastInsertRowid
				);
			}
		} catch (e) {
			if (e instanceof QuotaError) {
				db.prepare('DELETE FROM pcs WHERE id = ?').run(info.lastInsertRowid);
				return json({ error: e.message }, { status: 413 });
			}
			throw e;
		}
	}
	return json({ ok: true, id: info.lastInsertRowid });
}
