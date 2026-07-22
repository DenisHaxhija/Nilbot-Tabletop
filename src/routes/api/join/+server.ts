import { json } from '@sveltejs/kit';
import crypto from 'node:crypto';
import { db, getSetting } from '$lib/server/db';
import { createUser, createSession } from '$lib/server/auth';

// The invite handshake: a player presents a key. Valid = exists, not
// revoked, never claimed. Claiming is permanent — it binds the key to the
// freshly minted player identity and the key dies for everyone else.
export async function POST({ request }) {
	const body = await request.json().catch(() => ({}));
	const code = String(body.code ?? '').trim().toUpperCase();
	if (!code) return json({ error: 'Present a key.' }, { status: 400 });

	const invite = db
		.prepare('SELECT * FROM invites WHERE code = ?')
		.get(code) as
		| { id: number; user_id: number; player_name: string; revoked: number; claimed_at: string | null }
		| undefined;
	if (!invite || invite.revoked) {
		return json({ error: 'That key opens nothing here.' }, { status: 403 });
	}
	if (invite.claimed_at) {
		return json({ error: 'That key has already been used.' }, { status: 403 });
	}

	const username = `player:${invite.player_name}:${crypto.randomBytes(4).toString('hex')}`;
	const user = createUser(username, crypto.randomBytes(24).toString('hex'), 'player');
	db.prepare(
		`UPDATE invites SET claimed_at = datetime('now'), claimed_by = ? WHERE id = ?`
	).run(user.id, invite.id);

	const { token, expires } = createSession(user.id);
	return json({
		ok: true,
		token,
		expires: expires.toISOString(),
		playerName: invite.player_name,
		dmName: getSetting(invite.user_id, 'dm_name', 'the DM')
	});
}
