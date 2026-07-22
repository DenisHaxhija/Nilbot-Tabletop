import { error } from '@sveltejs/kit';
import { db, getSetting } from '$lib/server/db';

// The player's seat: everything here is scoped through their claimed invite
// to the DM who cut the key.
export function load({ locals }) {
	const invite = db
		.prepare('SELECT * FROM invites WHERE claimed_by = ? AND revoked = 0')
		.get(locals.user!.id) as
		| { id: number; user_id: number; player_name: string; pc_id: number | null }
		| undefined;
	if (!invite) error(403, 'Your key has been revoked. Ask your DM for a new one.');

	const dmId = invite.user_id;
	const mine = invite.pc_id
		? (db
				.prepare('SELECT id, name, class, gold, conditions FROM pcs WHERE id = ? AND user_id = ?')
				.get(invite.pc_id, dmId) as
				| { id: number; name: string; class: string; gold: number; conditions: string }
				| undefined)
		: undefined;

	const party = db
		.prepare('SELECT id, name, class FROM pcs WHERE user_id = ? ORDER BY created_at')
		.all(dmId) as { id: number; name: string; class: string }[];

	const nextSession = db
		.prepare(
			`SELECT title, at, note FROM schedule_events
			 WHERE user_id = ? AND at > datetime('now') ORDER BY at LIMIT 1`
		)
		.get(dmId) as { title: string; at: string; note: string } | undefined;

	return {
		playerName: invite.player_name,
		dmName: getSetting(dmId, 'dm_name', 'the DM'),
		me: mine
			? {
					id: mine.id,
					name: mine.name,
					class: mine.class,
					gold: mine.gold,
					conditions: mine.conditions.split(',').filter(Boolean)
				}
			: null,
		party,
		nextSession: nextSession ?? null
	};
}
