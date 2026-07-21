import { error } from '@sveltejs/kit';
import { db } from '$lib/server/db';

export function load({ url, locals }) {
	const slug = url.searchParams.get('edit');
	if (!slug) return { edit: null };

	const uid = locals.user!.id;
	// Any sheet the user can see opens in the builder. Their own sheets are
	// edited in place; shared ones (user_id NULL) save as a Custom copy.
	const row = db
		.prepare(
			'SELECT slug, name, token, data, user_id FROM monsters WHERE slug = ? AND (user_id IS NULL OR user_id = ?)'
		)
		.get(slug, uid) as
		| { slug: string; name: string; token: string | null; data: string; user_id: number | null }
		| undefined;
	if (!row) error(404, 'Sheet not found.');

	return {
		edit: {
			slug: row.slug,
			own: row.user_id === uid,
			sheet: JSON.parse(row.data),
			tokenUrl: row.token ? `/api/token/${encodeURIComponent(row.slug)}` : null
		}
	};
}
