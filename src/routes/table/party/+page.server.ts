import { db } from '$lib/server/db';
import { seatOf } from '$lib/server/seat';

export function load({ locals }) {
	const seat = seatOf(locals.user!.id);

	const party = db
		.prepare('SELECT id, name, class, level FROM pcs WHERE user_id = ? ORDER BY created_at')
		.all(seat.dmId) as { id: number; name: string; class: string; level: number }[];

	const nextSession = db
		.prepare(
			`SELECT title, at, note FROM schedule_events
			 WHERE user_id = ? AND at > datetime('now') ORDER BY at LIMIT 1`
		)
		.get(seat.dmId) as { title: string; at: string; note: string } | undefined;

	return { party, nextSession: nextSession ?? null };
}
