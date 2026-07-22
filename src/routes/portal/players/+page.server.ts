import { db } from '$lib/server/db';

function parseItems(raw: string): string[] {
	try {
		const v = JSON.parse(raw);
		return Array.isArray(v) ? v.map(String) : [];
	} catch {
		return [];
	}
}

export function load({ locals }) {
	const uid = locals.user!.id;
	const players = (
		db
			.prepare(
				`SELECT p.id, p.name, p.class, p.file, p.gold, p.conditions, p.level,
				        p.str, p.dex, p.con, p.intel, p.wis, p.cha, p.items,
				        p.sheet_slug, m.name AS sheet_name
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
			level: number;
			str: number;
			dex: number;
			con: number;
			intel: number;
			wis: number;
			cha: number;
			items: string;
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
		level: p.level,
		stats: { str: p.str, dex: p.dex, con: p.con, intel: p.intel, wis: p.wis, cha: p.cha },
		items: parseItems(p.items),
		sheetSlug: p.sheet_slug,
		sheetName: p.sheet_name
	}));
	return { players };
}
