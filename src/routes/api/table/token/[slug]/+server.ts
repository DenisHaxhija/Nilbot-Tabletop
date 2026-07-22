import { error } from '@sveltejs/kit';
import fs from 'node:fs';
import path from 'node:path';
import { db } from '$lib/server/db';
import { seatOf } from '$lib/server/seat';
import { getObject, MIME } from '$lib/server/storage';

// Seat-safe monster token art — mirrors /api/token/[slug], scoped to the
// DM's world (shared compendium + their own creatures).
const TOKENS_DIR = path.resolve('data', 'tokens');

export async function GET({ params, locals }) {
	const seat = seatOf(locals.user!.id);
	const row = db
		.prepare('SELECT token FROM monsters WHERE slug = ? AND (user_id IS NULL OR user_id = ?)')
		.get(decodeURIComponent(params.slug), seat.dmId) as { token: string | null } | undefined;
	if (!row?.token) error(404, 'No token art');

	let buf: Buffer | null;
	if (row.token.includes('/')) {
		buf = await getObject(row.token);
	} else {
		const filePath = path.join(TOKENS_DIR, path.basename(row.token));
		buf = fs.existsSync(filePath) ? fs.readFileSync(filePath) : null;
	}
	if (!buf) error(404, 'Token file missing');
	return new Response(new Uint8Array(buf), {
		headers: {
			'Content-Type': MIME[path.extname(row.token).toLowerCase()] ?? 'image/webp',
			'Cache-Control': 'public, max-age=86400'
		}
	});
}
