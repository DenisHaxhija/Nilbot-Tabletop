import { db } from '$lib/server/db';
import { seatOf } from '$lib/server/seat';
import { canvasCast } from '$lib/server/canvas';

// The seat's overview dashboard: a live glimpse of the canvas, the sheet
// at a glance, and the next gathering.
export function load({ locals }) {
	const seat = seatOf(locals.user!.id);

	const nextSession = db
		.prepare(
			`SELECT title, at, note FROM schedule_events
			 WHERE user_id = ? AND at > datetime('now') ORDER BY at LIMIT 1`
		)
		.get(seat.dmId) as { title: string; at: string; note: string } | undefined;

	const partyCount = (
		db.prepare('SELECT count(*) c FROM pcs WHERE user_id = ?').get(seat.dmId) as { c: number }
	).c;

	return {
		cast: canvasCast(seat.dmId, '/api/table/chars'),
		nextSession: nextSession ?? null,
		partyCount
	};
}
