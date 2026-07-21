import { searchSpells, spellFacets } from '$lib/server/db';

const PAGE_SIZE = 50;

export function load({ url, locals }) {
	const uid = locals.user!.id;
	const q = url.searchParams.get('q') ?? '';
	const level = url.searchParams.get('level') ?? '';
	const school = url.searchParams.get('school') ?? '';
	const klass = url.searchParams.get('class') ?? '';
	const source = url.searchParams.get('source') ?? '';
	const pageNum = Math.max(1, Number(url.searchParams.get('page') ?? 1));

	const { rows, total } = searchSpells(
		{
			q: q || undefined,
			level: level === '' ? undefined : Number(level),
			school: school || undefined,
			klass: klass || undefined,
			source: source || undefined,
			limit: PAGE_SIZE,
			offset: (pageNum - 1) * PAGE_SIZE
		},
		uid
	);

	return {
		spells: rows,
		total,
		page: pageNum,
		pages: Math.max(1, Math.ceil(total / PAGE_SIZE)),
		facets: spellFacets(uid),
		filters: { q, level, school, class: klass, source }
	};
}
