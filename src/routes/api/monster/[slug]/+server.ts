import { json, error } from '@sveltejs/kit';
import { getMonster } from '$lib/server/db';

export async function GET({ params, locals }) {
	const row = getMonster(decodeURIComponent(params.slug), locals.user!.id);
	if (!row) error(404, 'Monster not found');
	return json({
		meta: {
			img: row.token ? `/api/token/${encodeURIComponent(row.slug)}` : null,
			name: row.name,
			cr_text: row.cr_text,
			type: row.type,
			size: row.size,
			alignment: row.alignment,
			ac: row.ac,
			hp: row.hp,
			xp: row.xp,
			source: row.source,
			layer: row.layer
		},
		monster: JSON.parse(row.data)
	});
}
