import crypto from 'node:crypto';
import { db } from './db';

const SESSION_DAYS = 30;

export type Role = 'dm' | 'player';

export interface User {
	id: number;
	username: string;
	role: Role;
}

export function userExists(): boolean {
	return !!db.prepare('SELECT id FROM users LIMIT 1').get();
}

export function createUser(username: string, password: string, role: Role = 'dm'): User {
	const salt = crypto.randomBytes(16).toString('hex');
	const hash = crypto.scryptSync(password, salt, 64).toString('hex');
	const info = db
		.prepare('INSERT INTO users (username, pass_hash, salt, role) VALUES (?, ?, ?, ?)')
		.run(username, hash, salt, role);
	const id = Number(info.lastInsertRowid);

	// The very first DM account claims all pre-existing data. Player accounts
	// (invite-claimed) never claim anything.
	const count = (db.prepare('SELECT count(*) c FROM users').get() as { c: number }).c;
	if (count === 1 && role === 'dm') {
		db.prepare('UPDATE notes SET user_id = ? WHERE user_id IS NULL').run(id);
		db.prepare('UPDATE battles SET user_id = ? WHERE user_id IS NULL').run(id);
		db.prepare('UPDATE maps SET user_id = ? WHERE user_id IS NULL').run(id);
		db.prepare(`UPDATE monsters SET user_id = ? WHERE user_id IS NULL AND layer = 'user'`).run(id);
	}
	return { id, username, role };
}

export function verifyLogin(username: string, password: string): User | null {
	const row = db.prepare('SELECT * FROM users WHERE username = ?').get(username) as
		| { id: number; username: string; pass_hash: string; salt: string }
		| undefined;
	if (!row) return null;
	const hash = crypto.scryptSync(password, row.salt, 64);
	const stored = Buffer.from(row.pass_hash, 'hex');
	if (hash.length !== stored.length || !crypto.timingSafeEqual(hash, stored)) return null;
	return { id: row.id, username: row.username, role: (row as { role?: Role }).role ?? 'dm' };
}

export function changePassword(userId: number, password: string) {
	const salt = crypto.randomBytes(16).toString('hex');
	const hash = crypto.scryptSync(password, salt, 64).toString('hex');
	db.prepare('UPDATE users SET pass_hash = ?, salt = ? WHERE id = ?').run(hash, salt, userId);
	// New password invalidates all existing sessions.
	db.prepare('DELETE FROM auth_sessions WHERE user_id = ?').run(userId);
}

export function createSession(userId: number): { token: string; expires: Date } {
	const token = crypto.randomBytes(32).toString('hex');
	const expires = new Date(Date.now() + SESSION_DAYS * 86400_000);
	db.prepare('INSERT INTO auth_sessions (token, user_id, expires_at) VALUES (?, ?, ?)').run(
		token,
		userId,
		expires.toISOString()
	);
	return { token, expires };
}

export function validateSession(token: string | undefined): User | null {
	if (!token) return null;
	const row = db
		.prepare(
			`SELECT u.id, u.username, u.role, s.expires_at FROM auth_sessions s
			 JOIN users u ON u.id = s.user_id WHERE s.token = ?`
		)
		.get(token) as
		| { id: number; username: string; role: Role | null; expires_at: string }
		| undefined;
	if (!row) return null;
	if (new Date(row.expires_at) < new Date()) {
		db.prepare('DELETE FROM auth_sessions WHERE token = ?').run(token);
		return null;
	}
	return { id: row.id, username: row.username, role: row.role ?? 'dm' };
}

export function deleteSession(token: string | undefined) {
	if (token) db.prepare('DELETE FROM auth_sessions WHERE token = ?').run(token);
}
