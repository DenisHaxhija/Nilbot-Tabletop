import { db } from '$lib/server/db';

// The DM's live battle as a player may see it: the latest published battle
// with a staged map. The token payload is stripped to what the table screen
// shows — no HP, initiative or XP leaks to player machines — and media
// URLs are rewritten through the seat-safe endpoints.

function seatImg(img: unknown): string | null {
	if (typeof img !== 'string') return null;
	if (img.startsWith('/api/pcs/')) return img.replace('/api/pcs/', '/api/table/pcs/');
	if (img.startsWith('/api/token/')) return img.replace('/api/token/', '/api/table/token/');
	return null;
}

function sanitize(m: any) {
	return {
		mapId: m.mapId,
		scale: m.scale ?? 6,
		encounter: m.encounter
			? { round: m.encounter.round ?? 1, activeId: m.encounter.activeId ?? null }
			: null,
		tokens: (m.tokens ?? []).map((t: any) => ({
			id: t.id,
			kind: t.kind,
			name: t.name,
			label: t.label ?? '',
			type: t.type ?? null,
			cells: t.cells ?? 1,
			dead: !!t.dead,
			x: t.x,
			y: t.y,
			img: seatImg(t.img)
		}))
	};
}

export function publishedBattle(dmId: number) {
	const row = db
		.prepare(
			`SELECT id, title, map FROM battles
			 WHERE user_id = ? AND published = 1 AND map IS NOT NULL
			 ORDER BY created_at DESC LIMIT 1`
		)
		.get(dmId) as { id: number; title: string; map: string } | undefined;
	if (!row) return null;
	let m: any;
	try {
		m = JSON.parse(row.map);
	} catch {
		return null;
	}
	if (!m?.mapId) return null;
	return { id: row.id, title: row.title, map: sanitize(m) };
}
