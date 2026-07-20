import { json } from '@sveltejs/kit';
import fs from 'node:fs';
import path from 'node:path';
import { db } from '$lib/server/db';

const PCS_DIR = path.resolve('data', 'pcs');
const ALLOWED = ['.png', '.jpg', '.jpeg', '.webp', '.gif'];

export async function POST({ request, locals }) {
	const form = await request.formData();
	const name = String(form.get('name') ?? '').trim();
	const klass = String(form.get('class') ?? '').trim();
	if (!name) return json({ error: 'The character needs a name.' }, { status: 400 });

	const info = db
		.prepare('INSERT INTO pcs (user_id, name, class) VALUES (?, ?, ?)')
		.run(locals.user!.id, name, klass);

	const file = form.get('file');
	if (file instanceof File && file.size > 0) {
		const ext = path.extname(file.name).toLowerCase();
		if (ALLOWED.includes(ext)) {
			fs.mkdirSync(PCS_DIR, { recursive: true });
			const filename = `${info.lastInsertRowid}${ext}`;
			fs.writeFileSync(path.join(PCS_DIR, filename), Buffer.from(await file.arrayBuffer()));
			db.prepare('UPDATE pcs SET file = ? WHERE id = ?').run(filename, info.lastInsertRowid);
		}
	}
	return json({ ok: true, id: info.lastInsertRowid });
}
