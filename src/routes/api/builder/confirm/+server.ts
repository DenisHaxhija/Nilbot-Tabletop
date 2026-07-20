import { json } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { XP_BY_CR, parseCr } from '$lib/xp';
import { storeUserImage, QuotaError } from '$lib/server/storage';

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

	const cr = parseCr(sheet.challenge_rating as string);
	const cols = {
		name,
		cr,
		cr_text: sheet.challenge_rating ? String(sheet.challenge_rating) : null,
		type: sheet.type ? String(sheet.type).toLowerCase() : null,
		size: (sheet.size as string) ?? null,
		alignment: (sheet.alignment as string) ?? null,
		ac: typeof sheet.armor_class === 'number' ? sheet.armor_class : null,
		hp: typeof sheet.hit_points === 'number' ? sheet.hit_points : null,
		xp: cr !== null ? (XP_BY_CR[cr] ?? null) : null,
		data: JSON.stringify(sheet)
	};

	// Re-editing a baked sheet: update in place, slug stays stable so links
	// from characters/PCs keep working.
	const editSlug = String(form.get('slug') ?? '').trim();
	let slug: string;
	let rowId: number | bigint;
	let prevToken: { key: string | null; bytes: number | null } | undefined;

	if (editSlug) {
		const existing = db
			.prepare('SELECT id, token, token_bytes FROM monsters WHERE slug = ? AND user_id = ?')
			.get(editSlug, uid) as
			| { id: number; token: string | null; token_bytes: number | null }
			| undefined;
		if (!existing) return json({ error: 'Sheet not found.' }, { status: 404 });
		slug = editSlug;
		rowId = existing.id;
		// Only adapter-stored tokens (key contains '/') are replaceable files.
		if (existing.token?.includes('/')) {
			prevToken = { key: existing.token, bytes: existing.token_bytes };
		}
		db.prepare(
			`UPDATE monsters SET name = @name, cr = @cr, cr_text = @cr_text, type = @type, size = @size,
			 alignment = @alignment, ac = @ac, hp = @hp, xp = @xp, data = @data WHERE id = @id`
		).run({ ...cols, id: existing.id });
	} else {
		// Unique slug within this user's custom layer.
		const base = `custom:${uid}:${name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
		slug = base;
		for (let n = 2; db.prepare('SELECT 1 FROM monsters WHERE slug = ?').get(slug); n++) {
			slug = `${base}-${n}`;
		}
		const info = db
			.prepare(
				`INSERT INTO monsters (slug, name, cr, cr_text, type, size, alignment, ac, hp, xp, environment, source, layer, data, user_id)
				 VALUES (@slug, @name, @cr, @cr_text, @type, @size, @alignment, @ac, @hp, @xp, NULL, 'Custom', 'user', @data, @uid)`
			)
			.run({ ...cols, slug, uid });
		rowId = info.lastInsertRowid;
	}

	const file = form.get('file');
	if (file instanceof File && file.size > 0) {
		try {
			const stored = await storeUserImage(uid, 'tokens', rowId, file, prevToken);
			if (stored) {
				db.prepare('UPDATE monsters SET token = ?, token_bytes = ? WHERE id = ?').run(
					stored.key,
					stored.bytes,
					rowId
				);
			}
		} catch (e) {
			if (e instanceof QuotaError) return json({ error: e.message, slug }, { status: 413 });
			throw e;
		}
	}

	return json({ ok: true, slug });
}
