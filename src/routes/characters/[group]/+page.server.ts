import { db } from '$lib/server/db';

export function load({ params, locals }) {
	const uid = locals.user!.id;
	const group = params.group === '_ungrouped' ? '' : decodeURIComponent(params.group);

	const characters = db
		.prepare(
			`SELECT c.id, c.name, c.title, c.description, c.notes, c.file, c.on_canvas, c.folder,
			        c.sheet_slug, m.name AS sheet_name
			 FROM characters c
			 LEFT JOIN monsters m ON m.slug = c.sheet_slug AND (m.user_id IS NULL OR m.user_id = c.user_id)
			 WHERE c.user_id = ? AND c.folder = ? ORDER BY c.name`
		)
		.all(uid, group)
		.map((c: any) => ({
			id: c.id,
			name: c.name,
			title: c.title,
			description: c.description,
			notes: c.notes,
			folder: c.folder,
			onCanvas: !!c.on_canvas,
			img: c.file ? `/api/characters/${c.id}` : null,
			sheetSlug: c.sheet_slug ?? '',
			sheetName: c.sheet_name ?? null
		}));

	const folders = [
		...new Set([
			...(db
				.prepare('SELECT name FROM char_groups WHERE user_id = ?')
				.all(uid)
				.map((r: any) => r.name as string) ?? []),
			...(db
				.prepare(`SELECT DISTINCT folder FROM characters WHERE user_id = ? AND folder != ''`)
				.all(uid)
				.map((r: any) => r.folder as string) ?? [])
		])
	].sort();

	return { group, characters, folders };
}
