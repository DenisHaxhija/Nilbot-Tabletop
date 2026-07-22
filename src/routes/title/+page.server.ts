import { db, getSetting } from '$lib/server/db';

export function load({ locals }) {
	const uid = locals.user!.id;
	// "Continue" should feel like resuming a save — surface the campaign state.
	const lastSession = db
		.prepare(
			'SELECT title, updated_at FROM notes WHERE user_id = ? ORDER BY updated_at DESC LIMIT 1'
		)
		.get(uid) as { title: string; updated_at: string } | undefined;
	return {
		dmName: getSetting(uid, 'dm_name', locals.user!.username),
		lastSession: lastSession ?? null
	};
}
