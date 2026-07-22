import { seatOf } from '$lib/server/seat';
import { canvasCast } from '$lib/server/canvas';

// The seat's window onto the DM's canvas — same masked cast as the
// table screen, live-updated by /api/table/canvas/stream.
export function load({ locals }) {
	const seat = seatOf(locals.user!.id);
	return { cast: canvasCast(seat.dmId, '/api/table/chars') };
}
