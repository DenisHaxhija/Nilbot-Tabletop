import { redirect } from '@sveltejs/kit';
import { db } from '$lib/server/db';

export function load({ locals }) {
	const notes = db
		.prepare(
			`SELECT id, title, updated_at, substr(content, 1, 160) AS preview FROM notes
			 WHERE user_id = ? ORDER BY updated_at DESC`
		)
		.all(locals.user!.id) as { id: number; title: string; updated_at: string; preview: string }[];
	return { notes };
}

export const actions = {
	create: async ({ locals }) => {
		const info = db
			.prepare(`INSERT INTO notes (title, content, user_id) VALUES ('Untitled session', '', ?)`)
			.run(locals.user!.id);
		redirect(303, `/notes/${info.lastInsertRowid}`);
	},
	delete: async ({ request, locals }) => {
		const form = await request.formData();
		const id = Number(form.get('id'));
		if (Number.isInteger(id)) {
			db.prepare('DELETE FROM battles WHERE note_id = ? AND user_id = ?').run(id, locals.user!.id);
			db.prepare('DELETE FROM notes WHERE id = ? AND user_id = ?').run(id, locals.user!.id);
		}
		return { ok: true };
	}
};
