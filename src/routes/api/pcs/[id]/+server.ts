import { json, error } from '@sveltejs/kit';
import fs from 'node:fs';
import path from 'node:path';
import { db } from '$lib/server/db';

const PCS_DIR = path.resolve('data', 'pcs');
const MIME: Record<string, string> = {
	'.png': 'image/png',
	'.jpg': 'image/jpeg',
	'.jpeg': 'image/jpeg',
	'.webp': 'image/webp',
	'.gif': 'image/gif'
};

function getRow(id: string, userId: number) {
	return db.prepare('SELECT * FROM pcs WHERE id = ? AND user_id = ?').get(Number(id), userId) as
		| { id: number; name: string; file: string | null }
		| undefined;
}

export async function GET({ params, locals }) {
	const row = getRow(params.id, locals.user!.id);
	if (!row?.file) error(404, 'No portrait');
	const filePath = path.join(PCS_DIR, path.basename(row.file));
	if (!fs.existsSync(filePath)) error(404, 'Portrait file missing');
	return new Response(fs.readFileSync(filePath), {
		headers: {
			'Content-Type': MIME[path.extname(row.file).toLowerCase()] ?? 'application/octet-stream',
			'Cache-Control': 'public, max-age=3600'
		}
	});
}

export async function DELETE({ params, locals }) {
	const row = getRow(params.id, locals.user!.id);
	if (row) {
		if (row.file) {
			const filePath = path.join(PCS_DIR, path.basename(row.file));
			if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
		}
		db.prepare('DELETE FROM pcs WHERE id = ?').run(row.id);
	}
	return json({ ok: true });
}
