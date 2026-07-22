import { db, getSetting } from '$lib/server/db';
import { seatOf, parseItems } from '$lib/server/seat';

// A granted item that matches the world's catalog arrives with its lore.
function resolveItems(names: string[], dmId: number) {
	const lookup = db.prepare(
		`SELECT name, type, rarity, attunement, desc FROM items
		 WHERE name = ? COLLATE NOCASE AND (user_id IS NULL OR user_id = ?) LIMIT 1`
	);
	return names.map((n) => {
		const hit = lookup.get(n, dmId) as
			| { name: string; type: string | null; rarity: string | null; attunement: string | null; desc: string }
			| undefined;
		return hit
			? { name: n, type: hit.type, rarity: hit.rarity, attunement: hit.attunement, desc: hit.desc }
			: { name: n, type: null, rarity: null, attunement: null, desc: '' };
	});
}

// The player's whole seat shell loads here once: their sheet feeds the
// sidebar and every page under /table.
export function load({ locals }) {
	const seat = seatOf(locals.user!.id);

	const mine = seat.pcId
		? (db
				.prepare(
					`SELECT id, name, class, level, gold, conditions, str, dex, con, intel, wis, cha,
					        items, spells, backstory
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
						spells: string;
						backstory: string;
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
					items: resolveItems(parseItems(mine.items), seat.dmId),
					spells: parseItems(mine.spells),
					backstory: mine.backstory
				}
			: null
	};
}
