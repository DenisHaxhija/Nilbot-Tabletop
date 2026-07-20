import { error } from '@sveltejs/kit';
import { db } from '$lib/server/db';

export function load({ params, locals }) {
	const uid = locals.user!.id;
	const page = db
		.prepare('SELECT * FROM journal_pages WHERE id = ? AND user_id = ?')
		.get(Number(params.id), uid) as
		| { id: number; title: string; section: string; content: string; updated_at: string }
		| undefined;
	if (!page) error(404, 'Journal page not found');

	// Sibling pages in the same section, for the OneNote-style page rail.
	const siblings = db
		.prepare(
			`SELECT id, title FROM journal_pages WHERE user_id = ? AND section = ?
			 ORDER BY title COLLATE NOCASE`
		)
		.all(uid, page.section) as { id: number; title: string }[];

	const sections = db
		.prepare(
			`SELECT DISTINCT section FROM journal_pages WHERE user_id = ? AND section != '' ORDER BY section`
		)
		.all(uid)
		.map((r: any) => r.section as string);

	return {
		page: { id: page.id, title: page.title, section: page.section, content: page.content },
		siblings,
		sections
	};
}
