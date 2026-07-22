import { error } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { seatOf } from '$lib/server/seat';
import { imageResponse } from '$lib/server/storage';

// Seat-safe character portraits: only what stands on the DM's canvas is
// reachable — nothing backstage leaks to players.
export async function GET({ params, locals }) {
	const seat = seatOf(locals.user!.id);
	const row = db
		.prepare('SELECT file FROM characters WHERE id = ? AND user_id = ? AND on_canvas = 1')
		.get(Number(params.id), seat.dmId) as { file: string | null } | undefined;
	const res = await imageResponse(row?.file);
	if (!res) error(404, 'No portrait');
	return res;
}
