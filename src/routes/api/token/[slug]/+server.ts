import { error } from '@sveltejs/kit';
import fs from 'node:fs';
import path from 'node:path';
import { db } from '$lib/server/db';
import { getObject, MIME } from '$lib/server/storage';

// Shared imported token art (5e.tools importer) lives outside the per-user
// store — it's an instance-level asset keyed by plain filename.
const TOKENS_DIR = path.resolve('data', 'tokens');

export async function GET({ params, locals }) {
	const row = db
		.prepare('SELECT token FROM monsters WHERE slug = ? AND (user_id IS NULL OR user_id = ?)')
		.get(decodeURIComponent(params.slug), locals.user!.id) as { token: string | null } | undefined;
	if (!row?.token) error(404, 'No token art');

	let buf: Buffer | null;
	if (row.token.includes('/')) {
		// User-store key (custom creatures built in the sheet builder).
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
