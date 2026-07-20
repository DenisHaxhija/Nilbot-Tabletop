import { json, error } from '@sveltejs/kit';
import path from 'node:path';
import { db } from '$lib/server/db';
import { getObject, deleteObject, addUsage } from '$lib/server/storage';

const MIME: Record<string, string> = {
	'.png': 'image/png',
	'.jpg': 'image/jpeg',
	'.jpeg': 'image/jpeg',
	'.webp': 'image/webp',
	'.gif': 'image/gif'
};

function getRow(id: string, userId: number) {
	return db.prepare('SELECT * FROM maps WHERE id = ? AND user_id = ?').get(Number(id), userId) as
		| { id: number; name: string; file: string; bytes: number | null; user_id: number }
		| undefined;
}

export async function GET({ params, locals }) {
	const row = getRow(params.id, locals.user!.id);
	if (!row) error(404, 'Map not found');
	const buf = await getObject(row.file);
	if (!buf) error(404, 'Map file missing');
	return new Response(new Uint8Array(buf), {
		headers: {
			'Content-Type': MIME[path.extname(row.file).toLowerCase()] ?? 'application/octet-stream',
			'Cache-Control': 'public, max-age=86400'
		}
	});
}

export async function PATCH({ params, request, locals }) {
	const row = getRow(params.id, locals.user!.id);
	if (!row) error(404, 'Map not found');
	const body = await request.json();
	if (typeof body.tags === 'string') {
		const tags = body.tags
			.split(',')
			.map((t: string) => t.trim().toLowerCase())
			.filter(Boolean)
			.join(',');
		db.prepare('UPDATE maps SET tags = ? WHERE id = ?').run(tags, row.id);
	}
	if (typeof body.name === 'string' && body.name.trim()) {
		db.prepare('UPDATE maps SET name = ? WHERE id = ?').run(body.name.trim(), row.id);
	}
	return json({ ok: true });
}

export async function DELETE({ params, locals }) {
	const row = getRow(params.id, locals.user!.id);
	if (row) {
		await deleteObject(row.file);
		db.prepare('DELETE FROM maps WHERE id = ?').run(row.id);
		addUsage(row.user_id, -(row.bytes ?? 0));
	}
	return json({ ok: true });
}
