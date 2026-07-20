import { error } from '@sveltejs/kit';
import { db } from '$lib/server/db';

export function load({ url, locals }) {
	const slug = url.searchParams.get('edit');
	if (!slug) return { edit: null };

	// Only the user's own sheets can be loaded for editing.
	const row = db
		.prepare('SELECT slug, name, token, data FROM monsters WHERE slug = ? AND user_id = ?')
		.get(slug, locals.user!.id) as
		| { slug: string; name: string; token: string | null; data: string }
		| undefined;
	if (!row) error(404, 'Sheet not found (only your own Custom sheets can be edited).');

	return {
		edit: {
			slug: row.slug,
			sheet: JSON.parse(row.data),
			tokenUrl: row.token ? `/api/token/${encodeURIComponent(row.slug)}` : null
		}
	};
}
