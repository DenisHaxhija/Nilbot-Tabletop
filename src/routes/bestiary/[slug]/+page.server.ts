import { error } from '@sveltejs/kit';
import { getMonster } from '$lib/server/db';

export function load({ params, locals }) {
	const row = getMonster(decodeURIComponent(params.slug), locals.user!.id);
	if (!row) error(404, 'Monster not found');
	return {
		slug: row.slug,
		// Only the user's own sheets (Custom, built in the Sheet Builder) can be edited.
		editable: row.user_id === locals.user!.id,
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
	};
}
