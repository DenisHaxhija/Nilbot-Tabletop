import { db } from '$lib/server/db';

export function load({ locals }) {
	const uid = locals.user!.id;
	const players = (
		db
			.prepare('SELECT id, name, class, file FROM pcs WHERE user_id = ? ORDER BY created_at')
			.all(uid) as { id: number; name: string; class: string; file: string | null }[]
	).map((p) => ({
		id: p.id,
		name: p.name,
		class: p.class,
		img: p.file ? `/api/pcs/${p.id}` : null
	}));

	// Upcoming first; the recent past lingers briefly (last 24h) so a
	// just-finished session doesn't vanish mid-goodbye.
	const events = db
		.prepare(
			`SELECT id, title, at, note FROM schedule_events
			 WHERE user_id = ? AND at > datetime('now', '-1 day') ORDER BY at`
		)
		.all(uid) as { id: number; title: string; at: string; note: string }[];

	return { players, events };
}
