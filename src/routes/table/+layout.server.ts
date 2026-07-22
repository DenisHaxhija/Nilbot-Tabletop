import { db, getSetting } from '$lib/server/db';
import { seatOf, parseItems } from '$lib/server/seat';

// The player's whole seat shell loads here once: their sheet feeds the
// sidebar and every page under /table.
export function load({ locals }) {
	const seat = seatOf(locals.user!.id);

	const mine = seat.pcId
		? (db
				.prepare(
					`SELECT id, name, class, level, gold, conditions, str, dex, con, intel, wis, cha, items
					 FROM pcs WHERE id = ? AND user_id = ?`
				)
				.get(seat.pcId, seat.dmId) as
				| {
						id: number;
						name: string;
						class: string;
						level: number;
						gold: number;
						conditions: string;
						str: number;
						dex: number;
						con: number;
						intel: number;
						wis: number;
						cha: number;
						items: string;
				  }
				| undefined)
		: undefined;

	return {
		playerName: seat.playerName,
		dmName: getSetting(seat.dmId, 'dm_name', 'the DM'),
		me: mine
			? {
					id: mine.id,
					name: mine.name,
					class: mine.class,
					level: mine.level,
					gold: mine.gold,
					conditions: mine.conditions.split(',').filter(Boolean),
					stats: {
						str: mine.str,
						dex: mine.dex,
						con: mine.con,
						intel: mine.intel,
						wis: mine.wis,
						cha: mine.cha
					},
					items: parseItems(mine.items)
				}
			: null
	};
}
