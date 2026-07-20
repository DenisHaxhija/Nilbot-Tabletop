import { db, getSetting } from '$lib/server/db';

export function load({ locals }) {
	const uid = locals.user!.id;
	const dmName = getSetting(uid, 'dm_name', locals.user!.username);

	const counts = {
		notes: (db.prepare('SELECT count(*) c FROM notes WHERE user_id = ?').get(uid) as { c: number }).c,
		monsters: (
			db.prepare('SELECT count(*) c FROM monsters WHERE user_id IS NULL OR user_id = ?').get(uid) as { c: number }
		).c,
		battles: (db.prepare('SELECT count(*) c FROM battles WHERE user_id = ?').get(uid) as { c: number }).c,
		maps: (db.prepare('SELECT count(*) c FROM maps WHERE user_id = ?').get(uid) as { c: number }).c,
		tokens: (
			db
				.prepare('SELECT count(*) c FROM monsters WHERE token IS NOT NULL AND (user_id IS NULL OR user_id = ?)')
				.get(uid) as { c: number }
		).c
	};

	const pcs = db
		.prepare('SELECT id, name, class, file FROM pcs WHERE user_id = ? ORDER BY created_at')
		.all(uid)
		.map((p: any) => ({
			id: p.id,
			name: p.name,
			class: p.class,
			img: p.file ? `/api/pcs/${p.id}` : null
		}));

	const lastSession = db
		.prepare(
			`SELECT id, title, updated_at, substr(content, 1, 260) AS preview FROM notes
			 WHERE user_id = ? ORDER BY updated_at DESC LIMIT 1`
		)
		.get(uid) as { id: number; title: string; updated_at: string; preview: string } | undefined;

	// Monster of the day: deterministic pick that changes daily, from monsters
	// this user can see that have token art.
	const day = new Date().toISOString().slice(0, 10);
	let hash = 0;
	for (const ch of day) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0;
	const spotlightRow = db
		.prepare(
			`SELECT slug, name, cr_text, type, size, source FROM monsters
			 WHERE token IS NOT NULL AND (user_id IS NULL OR user_id = ?)
			 ORDER BY id LIMIT 1 OFFSET ?`
		)
		.get(uid, counts.tokens ? hash % counts.tokens : 0) as
		| { slug: string; name: string; cr_text: string | null; type: string | null; size: string | null; source: string | null }
		| undefined;

	return {
		dmName,
		counts,
		pcs,
		lastSession,
		spotlight: spotlightRow
			? { ...spotlightRow, img: `/api/token/${encodeURIComponent(spotlightRow.slug)}` }
			: null
	};
}
