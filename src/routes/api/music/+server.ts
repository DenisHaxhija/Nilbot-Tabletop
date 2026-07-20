import { json } from '@sveltejs/kit';
import path from 'node:path';
import { db } from '$lib/server/db';
import { putObject, assertQuota, addUsage, QuotaError } from '$lib/server/storage';

const ALLOWED = ['.mp3', '.ogg', '.wav', '.m4a', '.flac', '.webm'];

export async function POST({ request, locals }) {
	const uid = locals.user!.id;
	const form = await request.formData();
	const name = String(form.get('name') ?? '').trim();
	const grp = String(form.get('grp') ?? '').trim();
	const url = String(form.get('url') ?? '').trim();
	const file = form.get('file');
	if (!name) return json({ error: 'The song needs a name.' }, { status: 400 });
	if (!url && !(file instanceof File && file.size > 0)) {
		return json({ error: 'Add a link or an audio file.' }, { status: 400 });
	}
	if (url && !/^https?:\/\//.test(url)) {
		return json({ error: 'Links must start with http(s)://' }, { status: 400 });
	}

	let buf: Buffer | null = null;
	let ext = '';
	if (file instanceof File && file.size > 0) {
		ext = path.extname(file.name).toLowerCase();
		if (!ALLOWED.includes(ext)) {
			return json({ error: `Unsupported audio type ${ext}` }, { status: 400 });
		}
		buf = Buffer.from(await file.arrayBuffer());
		try {
			assertQuota(uid, buf.length);
		} catch (e) {
			if (e instanceof QuotaError) return json({ error: e.message }, { status: 413 });
			throw e;
		}
	}

	const info = db
		.prepare('INSERT INTO songs (user_id, name, grp, url) VALUES (?, ?, ?, ?)')
		.run(uid, name, grp, url || null);

	if (buf) {
		const key = `u${uid}/music/${info.lastInsertRowid}${ext}`;
		await putObject(key, buf);
		db.prepare('UPDATE songs SET file = ?, bytes = ? WHERE id = ?').run(
			key,
			buf.length,
			info.lastInsertRowid
		);
		addUsage(uid, buf.length);
	}
	return json({ ok: true, id: info.lastInsertRowid });
}
