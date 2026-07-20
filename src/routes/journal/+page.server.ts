import { db } from '$lib/server/db';

export function load({ url, locals }) {
	const uid = locals.user!.id;
	const rows = db
		.prepare(
			`SELECT id, title, section, parent_id, updated_at FROM journal_pages
			 WHERE user_id = ? ORDER BY created_at`
		)
		.all(uid) as {
		id: number;
		title: string;
		section: string;
		parent_id: number | null;
		updated_at: string;
	}[];

	// Sections alphabetical, loose ('') pages last; pages in creation order
	// (like OneNote — new pages append), subpages nested under their parent.
	const names = [...new Set(rows.map((p) => p.section))].sort((a, b) =>
		a === '' ? 1 : b === '' ? -1 : a.localeCompare(b)
	);
	const sections = names.map((name) => {
		const inSection = rows.filter((p) => p.section === name);
		const pages = inSection
			.filter((p) => p.parent_id === null)
			.map((p) => ({
				id: p.id,
				title: p.title,
				subs: inSection
					.filter((s) => s.parent_id === p.id)
					.map((s) => ({ id: s.id, title: s.title }))
			}));
		// Orphaned subpages (parent moved away) show as top-level.
		const shown = new Set(pages.flatMap((p) => [p.id, ...p.subs.map((s) => s.id)]));
		for (const p of inSection) {
			if (!shown.has(p.id)) pages.push({ id: p.id, title: p.title, subs: [] });
		}
		return { name, pages };
	});

	const wanted = Number(url.searchParams.get('p'));
	const selectedId = rows.some((p) => p.id === wanted)
		? wanted
		: (sections[0]?.pages[0]?.id ?? null);
	const selected = selectedId
		? (db
				.prepare(
					'SELECT id, title, section, content, parent_id, updated_at FROM journal_pages WHERE id = ? AND user_id = ?'
				)
				.get(selectedId, uid) as {
				id: number;
				title: string;
				section: string;
				content: string;
				parent_id: number | null;
				updated_at: string;
			})
		: null;

	return { sections, selected };
}
