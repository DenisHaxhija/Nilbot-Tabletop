import { db } from '$lib/server/db';

export function load({ params, locals }) {
	const uid = locals.user!.id;
	const group = params.group === '_ungrouped' ? '' : decodeURIComponent(params.group);

	const characters = db
		.prepare(
			'SELECT id, name, title, description, notes, file, on_canvas, folder FROM characters WHERE user_id = ? AND folder = ? ORDER BY name'
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
			img: c.file ? `/api/characters/${c.id}` : null
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
