import { searchMonsters, monsterFacets } from '$lib/server/db';

const PAGE_SIZE = 50;

export function load({ url, locals }) {
	const uid = locals.user!.id;
	const q = url.searchParams.get('q') ?? '';
	const type = url.searchParams.get('type') ?? '';
	const size = url.searchParams.get('size') ?? '';
	const source = url.searchParams.get('source') ?? '';
	const crMin = url.searchParams.get('crMin');
	const crMax = url.searchParams.get('crMax');
	const pageNum = Math.max(1, Number(url.searchParams.get('page') ?? 1));

	const { rows, total } = searchMonsters(
		{
			q: q || undefined,
			type: type || undefined,
			size: size || undefined,
			source: source || undefined,
			crMin: crMin ? Number(crMin) : undefined,
			crMax: crMax ? Number(crMax) : undefined,
			limit: PAGE_SIZE,
			offset: (pageNum - 1) * PAGE_SIZE
		},
		uid
	);

	return {
		monsters: rows.map((r) => ({
			slug: r.slug,
			name: r.name,
			cr_text: r.cr_text,
			type: r.type,
			size: r.size,
			ac: r.ac,
			hp: r.hp,
			source: r.source,
			img: r.token ? `/api/token/${encodeURIComponent(r.slug)}` : null
		})),
		total,
		page: pageNum,
		pages: Math.max(1, Math.ceil(total / PAGE_SIZE)),
		facets: monsterFacets(uid),
		filters: { q, type, size, source, crMin: crMin ?? '', crMax: crMax ?? '' }
	};
}
