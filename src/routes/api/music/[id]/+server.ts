import { json, error } from '@sveltejs/kit';
import path from 'node:path';
import { db } from '$lib/server/db';
import { getObject, getObjectRange, deleteObject, addUsage } from '$lib/server/storage';

const MIME: Record<string, string> = {
	'.mp3': 'audio/mpeg',
	'.ogg': 'audio/ogg',
	'.wav': 'audio/wav',
	'.m4a': 'audio/mp4',
	'.flac': 'audio/flac',
	'.webm': 'audio/webm'
};

function getRow(id: string, userId: number) {
	return db.prepare('SELECT * FROM songs WHERE id = ? AND user_id = ?').get(Number(id), userId) as
		| { id: number; name: string; file: string | null; bytes: number | null; user_id: number }
		| undefined;
}

// Streams the audio file with HTTP Range support so seeking works.
export async function GET({ params, request, locals }) {
	const row = getRow(params.id, locals.user!.id);
	if (!row?.file) error(404, 'No audio file');
	const mime = MIME[path.extname(row.file).toLowerCase()] ?? 'application/octet-stream';
	const range = request.headers.get('range');

	if (range) {
		const m = range.match(/bytes=(\d+)-(\d*)/);
		if (m) {
			const start = Number(m[1]);
			const end = m[2] ? Number(m[2]) : null;
			const res = await getObjectRange(row.file, start, end);
			if (res && res.buf.length > 0) {
				const realEnd = start + res.buf.length - 1;
				return new Response(new Uint8Array(res.buf), {
					status: 206,
					headers: {
						'Content-Type': mime,
						'Content-Range': `bytes ${start}-${realEnd}/${res.total}`,
						'Accept-Ranges': 'bytes',
						'Content-Length': String(res.buf.length)
					}
				});
			}
		}
	}
	const buf = await getObject(row.file);
	if (!buf) error(404, 'Audio file missing');
	return new Response(new Uint8Array(buf), {
		headers: {
			'Content-Type': mime,
			'Accept-Ranges': 'bytes',
			'Content-Length': String(buf.length),
			'Cache-Control': 'private, max-age=3600'
		}
	});
}

export async function DELETE({ params, locals }) {
	const row = getRow(params.id, locals.user!.id);
	if (row) {
		if (row.file) {
			await deleteObject(row.file);
			addUsage(row.user_id, -(row.bytes ?? 0));
		}
		db.prepare('DELETE FROM songs WHERE id = ?').run(row.id);
	}
	return json({ ok: true });
}
