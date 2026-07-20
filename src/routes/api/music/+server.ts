import { json } from '@sveltejs/kit';
import fs from 'node:fs';
import path from 'node:path';
import { db } from '$lib/server/db';

const MUSIC_DIR = path.resolve('data', 'music');
const ALLOWED = ['.mp3', '.ogg', '.wav', '.m4a', '.flac', '.webm'];

export async function POST({ request, locals }) {
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

	const info = db
		.prepare('INSERT INTO songs (user_id, name, grp, url) VALUES (?, ?, ?, ?)')
		.run(locals.user!.id, name, grp, url || null);

	if (file instanceof File && file.size > 0) {
		const ext = path.extname(file.name).toLowerCase();
		if (!ALLOWED.includes(ext)) {
			db.prepare('DELETE FROM songs WHERE id = ?').run(info.lastInsertRowid);
			return json({ error: `Unsupported audio type ${ext}` }, { status: 400 });
		}
		fs.mkdirSync(MUSIC_DIR, { recursive: true });
		const filename = `${info.lastInsertRowid}${ext}`;
		fs.writeFileSync(path.join(MUSIC_DIR, filename), Buffer.from(await file.arrayBuffer()));
		db.prepare('UPDATE songs SET file = ? WHERE id = ?').run(filename, info.lastInsertRowid);
	}
	return json({ ok: true, id: info.lastInsertRowid });
}
