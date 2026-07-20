import { json, error } from '@sveltejs/kit';
import fs from 'node:fs';
import path from 'node:path';
import { db } from '$lib/server/db';

const CHARS_DIR = path.resolve('data', 'characters');
const ALLOWED = ['.png', '.jpg', '.jpeg', '.webp', '.gif'];
const MIME: Record<string, string> = {
	'.png': 'image/png',
	'.jpg': 'image/jpeg',
	'.jpeg': 'image/jpeg',
	'.webp': 'image/webp',
	'.gif': 'image/gif'
};

function getRow(id: string, userId: number) {
	return db
		.prepare('SELECT * FROM characters WHERE id = ? AND user_id = ?')
		.get(Number(id), userId) as
		| { id: number; name: string; file: string | null }
		| undefined;
}

export async function GET({ params, locals }) {
	const row = getRow(params.id, locals.user!.id);
	if (!row?.file) error(404, 'No portrait');
	const filePath = path.join(CHARS_DIR, path.basename(row.file));
	if (!fs.existsSync(filePath)) error(404, 'Portrait file missing');
	return new Response(fs.readFileSync(filePath), {
		headers: {
			'Content-Type': MIME[path.extname(row.file).toLowerCase()] ?? 'application/octet-stream',
			'Cache-Control': 'public, max-age=3600'
		}
	});
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

	const file = form.get('file');
	if (file instanceof File && file.size > 0) {
		const ext = path.extname(file.name).toLowerCase();
		if (ALLOWED.includes(ext)) {
			if (row.file) {
				const old = path.join(CHARS_DIR, path.basename(row.file));
				if (fs.existsSync(old)) fs.unlinkSync(old);
			}
			fs.mkdirSync(CHARS_DIR, { recursive: true });
			const filename = `${row.id}${ext}`;
			fs.writeFileSync(path.join(CHARS_DIR, filename), Buffer.from(await file.arrayBuffer()));
			db.prepare('UPDATE characters SET file = ? WHERE id = ?').run(filename, row.id);
		}
	}
	return json({ ok: true });
}

export async function DELETE({ params, locals }) {
	const row = getRow(params.id, locals.user!.id);
	if (row) {
		if (row.file) {
			const filePath = path.join(CHARS_DIR, path.basename(row.file));
			if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
		}
		db.prepare('DELETE FROM characters WHERE id = ?').run(row.id);
	}
	return json({ ok: true });
}
