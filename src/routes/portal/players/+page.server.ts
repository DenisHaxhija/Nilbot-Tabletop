import { db } from '$lib/server/db';

export function load({ locals }) {
	const uid = locals.user!.id;
	const players = (
		db
			.prepare(
				`SELECT p.id, p.name, p.class, p.file, p.gold, p.conditions, p.sheet_slug, m.name AS sheet_name
				 FROM pcs p
				 LEFT JOIN monsters m ON m.slug = p.sheet_slug AND (m.user_id IS NULL OR m.user_id = p.user_id)
				 WHERE p.user_id = ? ORDER BY p.created_at`
			)
			.all(uid) as {
			id: number;
			name: string;
			class: string;
			file: string | null;
			gold: number;
			conditions: string;
			sheet_slug: string | null;
			sheet_name: string | null;
		}[]
	).map((p) => ({
		id: p.id,
		name: p.name,
		class: p.class,
		img: p.file ? `/api/pcs/${p.id}` : null,
		gold: p.gold,
		conditions: p.conditions.split(',').filter(Boolean),
		sheetSlug: p.sheet_slug,
		sheetName: p.sheet_name
	}));
	return { players };
}
