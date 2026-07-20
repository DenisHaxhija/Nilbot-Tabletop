import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
import { db } from './db';

// User-file storage behind one seam. Keys are always `u<userId>/<area>/<name>`
// so ownership is visible in the key itself and mirrors the per-user DB rows.
//
// Backends:
//   local (default) — files under data/store/<key>; right for dev and
//                     self-hosted instances.
//   s3              — any S3-compatible provider (Hetzner Object Storage,
//                     Cloudflare R2, AWS). Enabled with env:
//                     STORAGE_BACKEND=s3, S3_ENDPOINT, S3_REGION, S3_BUCKET,
//                     S3_ACCESS_KEY, S3_SECRET
//
// Quota: per-user byte accounting in users.storage_bytes, enforced at upload
// time. Cap comes from users.storage_cap_mb (per-user override) or the
// STORAGE_CAP_MB env (default 4096).

const LOCAL_ROOT = path.resolve('data', 'store');
const BACKEND = process.env.STORAGE_BACKEND === 's3' ? 's3' : 'local';

// ---------------------------------------------------------------- backends

let s3Client: import('@aws-sdk/client-s3').S3Client | null = null;
let s3cmds: typeof import('@aws-sdk/client-s3') | null = null;

async function s3(): Promise<{
	client: import('@aws-sdk/client-s3').S3Client;
	cmds: typeof import('@aws-sdk/client-s3');
	bucket: string;
}> {
	if (!s3Client) {
		s3cmds = await import('@aws-sdk/client-s3');
		s3Client = new s3cmds.S3Client({
			endpoint: process.env.S3_ENDPOINT,
			region: process.env.S3_REGION ?? 'auto',
			forcePathStyle: true,
			credentials: {
				accessKeyId: process.env.S3_ACCESS_KEY ?? '',
				secretAccessKey: process.env.S3_SECRET ?? ''
			}
		});
	}
	return { client: s3Client, cmds: s3cmds!, bucket: process.env.S3_BUCKET ?? 'nilbot' };
}

function localPath(key: string): string {
	const p = path.resolve(LOCAL_ROOT, key);
	if (!p.startsWith(LOCAL_ROOT + path.sep)) throw new Error('Path escape');
	return p;
}

export async function putObject(key: string, buf: Buffer): Promise<void> {
	if (BACKEND === 's3') {
		const { client, cmds, bucket } = await s3();
		await client.send(new cmds.PutObjectCommand({ Bucket: bucket, Key: key, Body: buf }));
	} else {
		const p = localPath(key);
		fs.mkdirSync(path.dirname(p), { recursive: true });
		fs.writeFileSync(p, buf);
	}
}

export async function getObject(key: string): Promise<Buffer | null> {
	if (BACKEND === 's3') {
		const { client, cmds, bucket } = await s3();
		try {
			const res = await client.send(new cmds.GetObjectCommand({ Bucket: bucket, Key: key }));
			return Buffer.from(await res.Body!.transformToByteArray());
		} catch {
			return null;
		}
	}
	const p = localPath(key);
	return fs.existsSync(p) ? fs.readFileSync(p) : null;
}

export async function getObjectRange(
	key: string,
	start: number,
	end: number | null
): Promise<{ buf: Buffer; total: number } | null> {
	if (BACKEND === 's3') {
		const { client, cmds, bucket } = await s3();
		try {
			const res = await client.send(
				new cmds.GetObjectCommand({
					Bucket: bucket,
					Key: key,
					Range: `bytes=${start}-${end ?? ''}`
				})
			);
			const total = Number(res.ContentRange?.split('/')[1] ?? 0);
			return { buf: Buffer.from(await res.Body!.transformToByteArray()), total };
		} catch {
			return null;
		}
	}
	const p = localPath(key);
	if (!fs.existsSync(p)) return null;
	const total = fs.statSync(p).size;
	const realEnd = Math.min(end ?? total - 1, total - 1);
	const buf = Buffer.alloc(realEnd - start + 1);
	const fd = fs.openSync(p, 'r');
	fs.readSync(fd, buf, 0, buf.length, start);
	fs.closeSync(fd);
	return { buf, total };
}

export async function deleteObject(key: string): Promise<void> {
	if (BACKEND === 's3') {
		const { client, cmds, bucket } = await s3();
		await client.send(new cmds.DeleteObjectCommand({ Bucket: bucket, Key: key }));
	} else {
		const p = localPath(key);
		if (fs.existsSync(p)) fs.unlinkSync(p);
	}
}

export function objectSize(key: string): number | null {
	// Local-only helper used by the migration; S3 sizes are tracked at put time.
	if (BACKEND !== 'local') return null;
	const p = localPath(key);
	return fs.existsSync(p) ? fs.statSync(p).size : null;
}

// ---------------------------------------------------------------- quota

const DEFAULT_CAP_MB = Number(process.env.STORAGE_CAP_MB ?? 4096);

export function quotaFor(userId: number): { usedBytes: number; capBytes: number } {
	const row = db
		.prepare('SELECT storage_bytes, storage_cap_mb FROM users WHERE id = ?')
		.get(userId) as { storage_bytes: number | null; storage_cap_mb: number | null } | undefined;
	return {
		usedBytes: row?.storage_bytes ?? 0,
		capBytes: (row?.storage_cap_mb ?? DEFAULT_CAP_MB) * 1024 * 1024
	};
}

// Throws a user-presentable message when the upload would exceed the cap.
export function assertQuota(userId: number, incomingBytes: number) {
	const { usedBytes, capBytes } = quotaFor(userId);
	if (usedBytes + incomingBytes > capBytes) {
		const mb = (n: number) => (n / 1024 / 1024).toFixed(1);
		throw new QuotaError(
			`Storage full: ${mb(usedBytes)} MB of ${mb(capBytes)} MB used, this file needs ${mb(incomingBytes)} MB. Delete something first.`
		);
	}
}

export class QuotaError extends Error {}

export function addUsage(userId: number, deltaBytes: number) {
	db.prepare(
		'UPDATE users SET storage_bytes = MAX(0, COALESCE(storage_bytes, 0) + ?) WHERE id = ?'
	).run(Math.round(deltaBytes), userId);
}

// ---------------------------------------------------------------- images

export const IMAGE_EXTS = ['.png', '.jpg', '.jpeg', '.webp', '.gif'];

// Full image-upload flow for a user file: compress → quota check → store →
// count usage. Replaces `prevKey`/`prevBytes` (the row's old file) if given.
// Throws QuotaError when the user is over cap.
export async function storeUserImage(
	userId: number,
	area: string,
	id: number | bigint,
	file: File,
	prev?: { key: string | null; bytes: number | null }
): Promise<{ key: string; bytes: number } | null> {
	let ext = path.extname(file.name).toLowerCase();
	if (!IMAGE_EXTS.includes(ext)) return null;
	let buf: Buffer = Buffer.from(await file.arrayBuffer());
	({ buf, ext } = await compressImage(buf, ext));
	assertQuota(userId, buf.length - (prev?.bytes ?? 0));
	if (prev?.key) {
		await deleteObject(prev.key);
		addUsage(userId, -(prev.bytes ?? 0));
	}
	const key = `u${userId}/${area}/${id}${ext}`;
	await putObject(key, buf);
	addUsage(userId, buf.length);
	return { key, bytes: buf.length };
}

export const MIME: Record<string, string> = {
	'.png': 'image/png',
	'.jpg': 'image/jpeg',
	'.jpeg': 'image/jpeg',
	'.webp': 'image/webp',
	'.gif': 'image/gif'
};

// Serve a stored object as an image response, or a 404-shaped null.
export async function imageResponse(key: string | null | undefined): Promise<Response | null> {
	if (!key) return null;
	const buf = await getObject(key);
	if (!buf) return null;
	return new Response(new Uint8Array(buf), {
		headers: {
			'Content-Type': MIME[path.extname(key).toLowerCase()] ?? 'application/octet-stream',
			'Cache-Control': 'public, max-age=3600'
		}
	});
}

const COMPRESSIBLE = ['.png', '.jpg', '.jpeg', '.webp'];

// Re-encode uploads to WebP (~30-50% smaller than JPEG at no visible loss).
// GIFs pass through to preserve animation.
export async function compressImage(
	buf: Buffer,
	ext: string
): Promise<{ buf: Buffer; ext: string }> {
	if (!COMPRESSIBLE.includes(ext.toLowerCase())) return { buf, ext };
	try {
		const out = await sharp(buf).rotate().webp({ quality: 82 }).toBuffer();
		// Keep the original if WebP somehow came out bigger (tiny images can).
		return out.length < buf.length ? { buf: out, ext: '.webp' } : { buf, ext };
	} catch {
		return { buf, ext }; // not a decodable image — store as-is
	}
}
