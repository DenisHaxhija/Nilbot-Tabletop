import { json } from '@sveltejs/kit';
import fs from 'node:fs';
import path from 'node:path';
import { db } from '$lib/server/db';
import { inferTags } from '$lib/tags';

const MAPS_DIR = path.resolve('data', 'maps');
const ALLOWED = ['.png', '.jpg', '.jpeg', '.webp', '.gif'];

export async function POST({ request, locals }) {
	const form = await request.formData();
	const file = form.get('file');
	if (!(file instanceof File) || file.size === 0) {
		return json({ error: 'No file uploaded.' }, { status: 400 });
	}
	const ext = path.extname(file.name).toLowerCase();
	if (!ALLOWED.includes(ext)) {
		return json({ error: `Unsupported file type ${ext}. Use PNG/JPG/WebP/GIF.` }, { status: 400 });
	}
	const name =
		String(form.get('name') || '').trim() || path.basename(file.name, ext).replace(/[-_]+/g, ' ');

	fs.mkdirSync(MAPS_DIR, { recursive: true });
	const kind = form.get('kind') === 'world' ? 'world' : 'battle';
	const info = db
		.prepare('INSERT INTO maps (name, file, user_id, tags, kind) VALUES (?, ?, ?, ?, ?)')
		.run(name, 'pending', locals.user!.id, kind === 'world' ? '' : inferTags(name), kind);
	const filename = `${info.lastInsertRowid}${ext}`;
	fs.writeFileSync(path.join(MAPS_DIR, filename), Buffer.from(await file.arrayBuffer()));
	db.prepare('UPDATE maps SET file = ? WHERE id = ?').run(filename, info.lastInsertRowid);

	return json({ ok: true, id: info.lastInsertRowid, name });
}
