import { error } from '@sveltejs/kit';
import fs from 'node:fs';
import path from 'node:path';
import { db } from '$lib/server/db';

const TOKENS_DIR = path.resolve('data', 'tokens');
const MIME: Record<string, string> = {
	'.png': 'image/png',
	'.jpg': 'image/jpeg',
	'.jpeg': 'image/jpeg',
	'.webp': 'image/webp',
	'.gif': 'image/gif'
};

export async function GET({ params, locals }) {
	const row = db
		.prepare('SELECT token FROM monsters WHERE slug = ? AND (user_id IS NULL OR user_id = ?)')
		.get(decodeURIComponent(params.slug), locals.user!.id) as { token: string | null } | undefined;
	if (!row?.token) error(404, 'No token art');
	const filePath = path.join(TOKENS_DIR, path.basename(row.token));
	if (!fs.existsSync(filePath)) error(404, 'Token file missing');
	return new Response(fs.readFileSync(filePath), {
		headers: {
			'Content-Type': MIME[path.extname(filePath).toLowerCase()] ?? 'image/webp',
			'Cache-Control': 'public, max-age=86400'
		}
	});
}
