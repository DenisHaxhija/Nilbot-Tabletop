import { json } from '@sveltejs/kit';
import fs from 'node:fs';
import path from 'node:path';
import { db } from '$lib/server/db';

const CHARS_DIR = path.resolve('data', 'characters');
const ALLOWED = ['.png', '.jpg', '.jpeg', '.webp', '.gif'];

export async function POST({ request, locals }) {
	const form = await request.formData();
	const name = String(form.get('name') ?? '').trim();
	if (!name) return json({ error: 'The character needs a name.' }, { status: 400 });

	const info = db
		.prepare(
			'INSERT INTO characters (user_id, name, title, description, notes, folder) VALUES (?, ?, ?, ?, ?, ?)'
		)
		.run(
			locals.user!.id,
			name,
			String(form.get('title') ?? '').trim(),
			String(form.get('description') ?? ''),
			String(form.get('notes') ?? ''),
			String(form.get('folder') ?? '').trim()
		);

	const file = form.get('file');
	if (file instanceof File && file.size > 0) {
		const ext = path.extname(file.name).toLowerCase();
		if (ALLOWED.includes(ext)) {
			fs.mkdirSync(CHARS_DIR, { recursive: true });
			const filename = `${info.lastInsertRowid}${ext}`;
			fs.writeFileSync(path.join(CHARS_DIR, filename), Buffer.from(await file.arrayBuffer()));
			db.prepare('UPDATE characters SET file = ? WHERE id = ?').run(filename, info.lastInsertRowid);
		}
	}
	return json({ ok: true, id: info.lastInsertRowid });
}
