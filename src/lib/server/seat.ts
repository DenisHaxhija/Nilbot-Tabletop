import { error } from '@sveltejs/kit';
import { db } from '$lib/server/db';

// Resolves a player's seat: everything on /table is scoped through their
// claimed invite to the DM who cut the key.
export interface Seat {
	inviteId: number;
	dmId: number;
	playerName: string;
	pcId: number | null;
}

export function seatOf(userId: number): Seat {
	const invite = db
		.prepare('SELECT id, user_id, player_name, pc_id FROM invites WHERE claimed_by = ? AND revoked = 0')
		.get(userId) as
		| { id: number; user_id: number; player_name: string; pc_id: number | null }
		| undefined;
	if (!invite) error(403, 'Your key has been revoked. Ask your DM for a new one.');
	return {
		inviteId: invite.id,
		dmId: invite.user_id,
		playerName: invite.player_name,
		pcId: invite.pc_id
	};
}

export function parseItems(raw: string): string[] {
	try {
		const v = JSON.parse(raw);
		return Array.isArray(v) ? v.map(String) : [];
	} catch {
		return [];
	}
}
