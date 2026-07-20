import { json, error } from '@sveltejs/kit';
import { db, sheetSlugFromForm } from '$lib/server/db';
import { imageResponse, storeUserImage, deleteObject, addUsage, QuotaError } from '$lib/server/storage';

function getRow(id: string, userId: number) {
	return db
		.prepare('SELECT * FROM characters WHERE id = ? AND user_id = ?')
		.get(Number(id), userId) as
		| { id: number; name: string; file: string | null; bytes: number | null; user_id: number }
		| undefined;
}

export async function GET({ params, locals }) {
	const row = getRow(params.id, locals.user!.id);
	const res = await imageResponse(row?.file);
	if (!res) error(404, 'No portrait');
	return res;
}

export async function POST({ params, request, locals }) {
	const row = getRow(params.id, locals.user!.id);
	if (!row) error(404, 'Character not found');
	const form = await request.formData();
	const name = String(form.get('name') ?? '').trim();
	if (!name) return json({ error: 'The character needs a name.' }, { status: 400 });

	db.prepare(
		'UPDATE characters SET name = ?, title = ?, description = ?, notes = ?, folder = ? WHERE id = ?'
	).run(
		name,
		String(form.get('title') ?? '').trim(),
		String(form.get('description') ?? ''),
		String(form.get('notes') ?? ''),
		String(form.get('folder') ?? '').trim(),
		row.id
	);
	const sheetSlug = sheetSlugFromForm(form, locals.user!.id);
	if (sheetSlug !== undefined) {
		db.prepare('UPDATE characters SET sheet_slug = ? WHERE id = ?').run(sheetSlug, row.id);
	}

	const file = form.get('file');
	if (file instanceof File && file.size > 0) {
		try {
			const stored = await storeUserImage(locals.user!.id, 'characters', row.id, file, {
				key: row.file,
				bytes: row.bytes
			});
			if (stored) {
				db.prepare('UPDATE characters SET file = ?, bytes = ? WHERE id = ?').run(
					stored.key,
					stored.bytes,
					row.id
				);
			}
		} catch (e) {
			if (e instanceof QuotaError) return json({ error: e.message }, { status: 413 });
			throw e;
		}
	}
	return json({ ok: true });
}

export async function DELETE({ params, locals }) {
	const row = getRow(params.id, locals.user!.id);
	if (row) {
		if (row.file) {
			await deleteObject(row.file);
			addUsage(row.user_id, -(row.bytes ?? 0));
		}
		db.prepare('DELETE FROM characters WHERE id = ?').run(row.id);
	}
	return json({ ok: true });
}
