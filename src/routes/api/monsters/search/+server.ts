import { json } from '@sveltejs/kit';
import { searchMonsters } from '$lib/server/db';

export async function GET({ url, locals }) {
	const q = url.searchParams.get('q')?.trim() ?? '';
	if (!q) return json({ results: [] });
	const { rows } = searchMonsters({ q, limit: 8 }, locals.user!.id);
	return json({
		results: rows.map((r) => {
			let initMod = 0;
			try {
				const d = JSON.parse(r.data);
				const dex = d.dexterity ?? d.dex;
				if (typeof dex === 'number') initMod = Math.floor((dex - 10) / 2);
			} catch {
				// keep default
			}
			return {
				slug: r.slug,
				name: r.name,
				cr_text: r.cr_text,
				type: r.type,
				size: r.size,
				hp: r.hp,
				xp: r.xp,
				initMod,
				img: r.token ? `/api/token/${encodeURIComponent(r.slug)}` : null
			};
		})
	});
}
