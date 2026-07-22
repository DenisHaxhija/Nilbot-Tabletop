import { error } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { seatOf } from '$lib/server/seat';
import { imageResponse } from '$lib/server/storage';

// Seat-safe battle-map imagery, scoped to the DM whose table this is.
export async function GET({ params, locals }) {
	const seat = seatOf(locals.user!.id);
	const row = db
		.prepare('SELECT file FROM maps WHERE id = ? AND user_id = ?')
		.get(Number(params.id), seat.dmId) as { file: string | null } | undefined;
	const res = await imageResponse(row?.file);
	if (!res) error(404, 'No map');
	return res;
}
