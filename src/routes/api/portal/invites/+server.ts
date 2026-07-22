import { json } from '@sveltejs/kit';
import crypto from 'node:crypto';
import { db } from '$lib/server/db';

// 12 chars from an unambiguous alphabet (~60 bits) — read-aloud friendly,
// not guessable.
function newCode(): string {
	const alphabet = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
	return Array.from(crypto.randomBytes(12))
		.map((b) => alphabet[b % alphabet.length])
		.join('');
}

export async function POST({ request, locals }) {
	const body = await request.json();
	const playerName = String(body.playerName ?? '').trim();
	if (!playerName) return json({ error: 'Name the player this key is for.' }, { status: 400 });
	// Optional binding to a party character — the player's seat shows it.
	let pcId: number | null = Number(body.pcId) || null;
	if (pcId && !db.prepare('SELECT 1 FROM pcs WHERE id = ? AND user_id = ?').get(pcId, locals.user!.id)) {
		pcId = null;
	}
	const code = newCode();
	const info = db
		.prepare('INSERT INTO invites (user_id, player_name, code, pc_id) VALUES (?, ?, ?, ?)')
		.run(locals.user!.id, playerName, code, pcId);
	return json({ ok: true, id: info.lastInsertRowid, code });
}

// Revoke (keeps the audit trail); unclaimed keys may be hard-deleted.
export async function DELETE({ request, locals }) {
	const { id, hard } = await request.json();
	const row = db
		.prepare('SELECT id, claimed_at FROM invites WHERE id = ? AND user_id = ?')
		.get(Number(id), locals.user!.id) as { id: number; claimed_at: string | null } | undefined;
	if (!row) return json({ ok: true });
	if (hard && !row.claimed_at) {
		db.prepare('DELETE FROM invites WHERE id = ?').run(row.id);
	} else {
		db.prepare('UPDATE invites SET revoked = 1 WHERE id = ?').run(row.id);
	}
	return json({ ok: true });
}
