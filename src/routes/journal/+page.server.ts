import { db } from '$lib/server/db';

export function load({ url, locals }) {
	const uid = locals.user!.id;
	const pages = db
		.prepare(
			`SELECT id, title, section, updated_at FROM journal_pages
			 WHERE user_id = ? ORDER BY title COLLATE NOCASE`
		)
		.all(uid) as { id: number; title: string; section: string; updated_at: string }[];

	// Sections in alphabetical order; loose ('') pages last.
	const names = [...new Set(pages.map((p) => p.section))].sort((a, b) =>
		a === '' ? 1 : b === '' ? -1 : a.localeCompare(b)
	);
	const sections = names.map((name) => ({
		name,
		pages: pages.filter((p) => p.section === name)
	}));

	// Selected page: ?p=<id>, else the first page of the first section.
	const wanted = Number(url.searchParams.get('p'));
	const selectedId = pages.some((p) => p.id === wanted) ? wanted : (sections[0]?.pages[0]?.id ?? null);
	const selected = selectedId
		? (db
				.prepare('SELECT id, title, section, content FROM journal_pages WHERE id = ? AND user_id = ?')
				.get(selectedId, uid) as { id: number; title: string; section: string; content: string })
		: null;

	return { sections, selected };
}
