import { db } from '$lib/server/db';

export function load({ locals }) {
	const uid = locals.user!.id;
	const pages = db
		.prepare(
			`SELECT id, title, section, updated_at FROM journal_pages
			 WHERE user_id = ? ORDER BY section, title COLLATE NOCASE`
		)
		.all(uid) as { id: number; title: string; section: string; updated_at: string }[];

	// Group into OneNote-style sections; '' sorts last as "Loose pages".
	const bySection = new Map<string, typeof pages>();
	for (const p of pages) {
		if (!bySection.has(p.section)) bySection.set(p.section, []);
		bySection.get(p.section)!.push(p);
	}
	const sections = [...bySection.entries()]
		.map(([name, ps]) => ({ name, pages: ps }))
		.sort((a, b) => (a.name === '' ? 1 : b.name === '' ? -1 : a.name.localeCompare(b.name)));

	return { sections };
}
