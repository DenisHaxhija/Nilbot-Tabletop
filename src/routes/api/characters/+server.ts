import { json } from '@sveltejs/kit';
import { db, sheetSlugFromForm } from '$lib/server/db';
import { storeUserImage, QuotaError } from '$lib/server/storage';

export async function POST({ request, locals }) {
	const uid = locals.user!.id;
	const form = await request.formData();
	const name = String(form.get('name') ?? '').trim();
	if (!name) return json({ error: 'The character needs a name.' }, { status: 400 });

	const info = db
		.prepare(
			'INSERT INTO characters (user_id, name, title, description, notes, folder, sheet_slug) VALUES (?, ?, ?, ?, ?, ?, ?)'
		)
		.run(
			uid,
			name,
			String(form.get('title') ?? '').trim(),
			String(form.get('description') ?? ''),
			String(form.get('notes') ?? ''),
			String(form.get('folder') ?? '').trim(),
			sheetSlugFromForm(form, uid) ?? null
		);

	const file = form.get('file');
	if (file instanceof File && file.size > 0) {
		try {
			const stored = await storeUserImage(uid, 'characters', info.lastInsertRowid, file);
			if (stored) {
				db.prepare('UPDATE characters SET file = ?, bytes = ? WHERE id = ?').run(
					stored.key,
					stored.bytes,
					info.lastInsertRowid
				);
			}
		} catch (e) {
			if (e instanceof QuotaError) {
				db.prepare('DELETE FROM characters WHERE id = ?').run(info.lastInsertRowid);
				return json({ error: e.message }, { status: 413 });
			}
			throw e;
		}
	}
	return json({ ok: true, id: info.lastInsertRowid });
}
