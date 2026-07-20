import { json } from '@sveltejs/kit';
import fs from 'node:fs';
import path from 'node:path';
import { db } from '$lib/server/db';
import { XP_BY_CR, parseCr } from '$lib/xp';

const TOKENS_DIR = path.resolve('data', 'tokens');
const ALLOWED = ['.png', '.jpg', '.jpeg', '.webp', '.gif'];

export async function POST({ request, locals }) {
	const uid = locals.user!.id;
	const form = await request.formData();
	let sheet: Record<string, unknown>;
	try {
		sheet = JSON.parse(String(form.get('sheet')));
	} catch {
		return json({ error: 'Invalid sheet data.' }, { status: 400 });
	}
	const name = String(sheet.name ?? '').trim();
	if (!name) return json({ error: 'The sheet needs a name.' }, { status: 400 });

	// Unique slug within this user's custom layer.
	const base = `custom:${uid}:${name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
	let slug = base;
	for (let n = 2; db.prepare('SELECT 1 FROM monsters WHERE slug = ?').get(slug); n++) {
		slug = `${base}-${n}`;
	}

	const cr = parseCr(sheet.challenge_rating as string);
	const info = db
		.prepare(
			`INSERT INTO monsters (slug, name, cr, cr_text, type, size, alignment, ac, hp, xp, environment, source, layer, data, user_id)
			 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, 'Custom', 'user', ?, ?)`
		)
		.run(
			slug,
			name,
			cr,
			sheet.challenge_rating ? String(sheet.challenge_rating) : null,
			sheet.type ? String(sheet.type).toLowerCase() : null,
			(sheet.size as string) ?? null,
			(sheet.alignment as string) ?? null,
			typeof sheet.armor_class === 'number' ? sheet.armor_class : null,
			typeof sheet.hit_points === 'number' ? sheet.hit_points : null,
			cr !== null ? (XP_BY_CR[cr] ?? null) : null,
			JSON.stringify(sheet),
			uid
		);

	const file = form.get('file');
	if (file instanceof File && file.size > 0) {
		const ext = path.extname(file.name).toLowerCase();
		if (ALLOWED.includes(ext)) {
			fs.mkdirSync(TOKENS_DIR, { recursive: true });
			const filename = `${info.lastInsertRowid}${ext}`;
			fs.writeFileSync(path.join(TOKENS_DIR, filename), Buffer.from(await file.arrayBuffer()));
			db.prepare('UPDATE monsters SET token = ? WHERE id = ?').run(filename, info.lastInsertRowid);
		}
	}

	return json({ ok: true, slug });
}
