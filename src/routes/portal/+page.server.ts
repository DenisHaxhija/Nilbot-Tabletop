import os from 'node:os';
import { db } from '$lib/server/db';

export function load({ locals }) {
	const uid = locals.user!.id;
	const players = (
		db
			.prepare('SELECT id, name, class, file FROM pcs WHERE user_id = ? ORDER BY created_at')
			.all(uid) as { id: number; name: string; class: string; file: string | null }[]
	).map((p) => ({
		id: p.id,
		name: p.name,
		class: p.class,
		img: p.file ? `/api/pcs/${p.id}` : null
	}));

	// Upcoming first; the recent past lingers briefly (last 24h) so a
	// just-finished session doesn't vanish mid-goodbye.
	const events = db
		.prepare(
			`SELECT id, title, at, note FROM schedule_events
			 WHERE user_id = ? AND at > datetime('now', '-1 day') ORDER BY at`
		)
		.all(uid) as { id: number; title: string; at: string; note: string }[];

	const invites = db
		.prepare(
			`SELECT i.id, i.player_name, i.code, i.created_at, i.claimed_at, i.revoked, p.name AS pc_name
			 FROM invites i LEFT JOIN pcs p ON p.id = i.pc_id
			 WHERE i.user_id = ? ORDER BY i.created_at DESC`
		)
		.all(uid) as {
		id: number;
		player_name: string;
		code: string;
		created_at: string;
		claimed_at: string | null;
		revoked: number;
		pc_name: string | null;
	}[];

	// LAN addresses players use to reach this table (port is the page's own).
	const lanIps = Object.values(os.networkInterfaces())
		.flat()
		.filter((i) => i && i.family === 'IPv4' && !i.internal)
		.map((i) => i!.address);

	return { players, events, invites, lanIps };
}
