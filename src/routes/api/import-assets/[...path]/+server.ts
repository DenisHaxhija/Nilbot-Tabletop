import { error } from '@sveltejs/kit';
import fs from 'node:fs';
import path from 'node:path';

// Serves images that came along with the OneNote import (data/onenote-export).
const ROOT = path.resolve('data', 'onenote-export');
const MIME: Record<string, string> = {
	'.png': 'image/png',
	'.jpg': 'image/jpeg',
	'.jpeg': 'image/jpeg',
	'.webp': 'image/webp',
	'.gif': 'image/gif',
	'.bmp': 'image/bmp',
	'.tif': 'image/tiff'
};

export async function GET({ params }) {
	const filePath = path.resolve(ROOT, params.path);
	if (!filePath.startsWith(ROOT + path.sep)) error(403, 'Forbidden');
	if (!fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) error(404, 'Not found');
	const ext = path.extname(filePath).toLowerCase();
	if (!MIME[ext]) error(403, 'Forbidden');
	return new Response(fs.readFileSync(filePath), {
		headers: { 'Content-Type': MIME[ext], 'Cache-Control': 'public, max-age=86400' }
	});
}
