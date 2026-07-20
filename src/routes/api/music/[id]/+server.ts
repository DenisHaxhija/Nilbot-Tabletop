import { json, error } from '@sveltejs/kit';
import fs from 'node:fs';
import path from 'node:path';
import { db } from '$lib/server/db';

const MUSIC_DIR = path.resolve('data', 'music');
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
		| { id: number; name: string; file: string | null }
		| undefined;
}

// Streams the audio file with HTTP Range support so seeking works.
export async function GET({ params, request, locals }) {
	const row = getRow(params.id, locals.user!.id);
	if (!row?.file) error(404, 'No audio file');
	const filePath = path.join(MUSIC_DIR, path.basename(row.file));
	if (!fs.existsSync(filePath)) error(404, 'Audio file missing');

	const stat = fs.statSync(filePath);
	const mime = MIME[path.extname(filePath).toLowerCase()] ?? 'application/octet-stream';
	const range = request.headers.get('range');

	if (range) {
		const m = range.match(/bytes=(\d+)-(\d*)/);
		if (m) {
			const start = Number(m[1]);
			const end = m[2] ? Math.min(Number(m[2]), stat.size - 1) : stat.size - 1;
			if (start <= end && start < stat.size) {
				const buf = Buffer.alloc(end - start + 1);
				const fd = fs.openSync(filePath, 'r');
				fs.readSync(fd, buf, 0, buf.length, start);
				fs.closeSync(fd);
				return new Response(buf, {
					status: 206,
					headers: {
						'Content-Type': mime,
						'Content-Range': `bytes ${start}-${end}/${stat.size}`,
						'Accept-Ranges': 'bytes',
						'Content-Length': String(buf.length)
					}
				});
			}
		}
	}
	return new Response(fs.readFileSync(filePath), {
		headers: {
			'Content-Type': mime,
			'Accept-Ranges': 'bytes',
			'Content-Length': String(stat.size),
			'Cache-Control': 'private, max-age=3600'
		}
	});
}

export async function DELETE({ params, locals }) {
	const row = getRow(params.id, locals.user!.id);
	if (row) {
		if (row.file) {
			const filePath = path.join(MUSIC_DIR, path.basename(row.file));
			if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
		}
		db.prepare('DELETE FROM songs WHERE id = ?').run(row.id);
	}
	return json({ ok: true });
}
