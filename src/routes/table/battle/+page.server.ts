import { seatOf } from '$lib/server/seat';
import { publishedBattle } from '$lib/server/battle';

// The seat's view of the fight — whatever battle the DM has published.
export function load({ locals }) {
	const seat = seatOf(locals.user!.id);
	return { battle: publishedBattle(seat.dmId) };
}
