import { db } from '$lib/server/db';

export function load({ locals }) {
	const maps = db
		.prepare(
			`SELECT id, name, created_at FROM maps WHERE user_id = ? AND kind = 'world' ORDER BY created_at DESC`
		)
		.all(locals.user!.id) as { id: number; name: string; created_at: string }[];
	return { maps };
}
