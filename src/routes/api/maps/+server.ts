import { json } from '@sveltejs/kit';
import path from 'node:path';
import { db } from '$lib/server/db';
import { inferTags } from '$lib/tags';
import {
	putObject,
	compressImage,
	assertQuota,
	addUsage,
	QuotaError
} from '$lib/server/storage';

const ALLOWED = ['.png', '.jpg', '.jpeg', '.webp', '.gif'];

export async function POST({ request, locals }) {
	const uid = locals.user!.id;
	const form = await request.formData();
	const file = form.get('file');
	if (!(file instanceof File) || file.size === 0) {
		return json({ error: 'No file uploaded.' }, { status: 400 });
	}
	let ext = path.extname(file.name).toLowerCase();
	if (!ALLOWED.includes(ext)) {
		return json({ error: `Unsupported file type ${ext}. Use PNG/JPG/WebP/GIF.` }, { status: 400 });
	}
	const name =
		String(form.get('name') || '').trim() || path.basename(file.name, ext).replace(/[-_]+/g, ' ');

	let buf: Buffer = Buffer.from(await file.arrayBuffer());
	({ buf, ext } = await compressImage(buf, ext));
	try {
		assertQuota(uid, buf.length);
	} catch (e) {
		if (e instanceof QuotaError) return json({ error: e.message }, { status: 413 });
		throw e;
	}

	const kind = form.get('kind') === 'world' ? 'world' : 'battle';
	const info = db
		.prepare('INSERT INTO maps (name, file, user_id, tags, kind, bytes) VALUES (?, ?, ?, ?, ?, ?)')
		.run(name, 'pending', uid, kind === 'world' ? '' : inferTags(name), kind, buf.length);
	const key = `u${uid}/maps/${info.lastInsertRowid}${ext}`;
	await putObject(key, buf);
	db.prepare('UPDATE maps SET file = ? WHERE id = ?').run(key, info.lastInsertRowid);
	addUsage(uid, buf.length);

	return json({ ok: true, id: info.lastInsertRowid, name });
}
