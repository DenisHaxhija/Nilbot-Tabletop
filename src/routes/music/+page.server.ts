import { db } from '$lib/server/db';

export function load({ locals }) {
	const songs = db
		.prepare('SELECT id, name, grp, url, file FROM songs WHERE user_id = ? ORDER BY grp, name')
		.all(locals.user!.id) as {
		id: number;
		name: string;
		grp: string;
		url: string | null;
		file: string | null;
	}[];

	const groups: { name: string; songs: typeof songs }[] = [];
	for (const s of songs) {
		let g = groups.find((g) => g.name === s.grp);
		if (!g) {
			g = { name: s.grp, songs: [] };
			groups.push(g);
		}
		g.songs.push(s);
	}
	groups.sort((a, b) => (a.name === '' ? 1 : b.name === '' ? -1 : a.name.localeCompare(b.name)));

	return { groups, folders: groups.map((g) => g.name).filter(Boolean) };
}
