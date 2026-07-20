import { db } from '$lib/server/db';

export function load({ locals }) {
	const uid = locals.user!.id;

	// Groups = explicitly created ones + any folder names already on characters.
	const explicit = db
		.prepare('SELECT name, hidden FROM char_groups WHERE user_id = ? ORDER BY name')
		.all(uid) as { name: string; hidden: number }[];
	const hiddenByName = new Map(explicit.map((r) => [r.name, !!r.hidden]));
	const implicit = db
		.prepare(`SELECT DISTINCT folder FROM characters WHERE user_id = ? AND folder != ''`)
		.all(uid)
		.map((r: any) => r.folder as string);
	const names = [...new Set([...explicit.map((r) => r.name), ...implicit])].sort((a, b) =>
		a.localeCompare(b)
	);

	const groups = names.map((name) => {
		const members = db
			.prepare(
				'SELECT id, name, file FROM characters WHERE user_id = ? AND folder = ? ORDER BY name LIMIT 5'
			)
			.all(uid, name) as { id: number; name: string; file: string | null }[];
		const count = (
			db
				.prepare('SELECT count(*) c FROM characters WHERE user_id = ? AND folder = ?')
				.get(uid, name) as { c: number }
		).c;
		return {
			name,
			count,
			hidden: hiddenByName.get(name) ?? false,
			preview: members.slice(0, 4).map((m) => (m.file ? `/api/characters/${m.id}` : null))
		};
	});

	const ungrouped = (
		db
			.prepare(`SELECT count(*) c FROM characters WHERE user_id = ? AND folder = ''`)
			.get(uid) as { c: number }
	).c;

	return { groups, ungrouped };
}
