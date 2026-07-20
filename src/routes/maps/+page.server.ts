import { db } from '$lib/server/db';

const PAGE_SIZE = 20;

export function load({ locals, url }) {
	const tag = url.searchParams.get('tag') ?? '';
	const pageNum = Math.max(1, Number(url.searchParams.get('page') ?? 1));
	const params: unknown[] = [locals.user!.id];
	let where = `user_id = ? AND kind = 'battle'`;
	if (tag === 'untagged') {
		where += ` AND tags = ''`;
	} else if (tag) {
		where += ` AND instr(',' || tags || ',', ?) > 0`;
		params.push(`,${tag},`);
	}
	const filtered = (
		db.prepare(`SELECT count(*) c FROM maps WHERE ${where}`).get(...params) as { c: number }
	).c;
	const pages = Math.max(1, Math.ceil(filtered / PAGE_SIZE));
	const maps = db
		.prepare(
			`SELECT id, name, tags, created_at FROM maps WHERE ${where} ORDER BY created_at DESC LIMIT ? OFFSET ?`
		)
		.all(...params, PAGE_SIZE, (Math.min(pageNum, pages) - 1) * PAGE_SIZE) as {
		id: number;
		name: string;
		tags: string;
		created_at: string;
	}[];
	const total = (
		db
			.prepare(`SELECT count(*) c FROM maps WHERE user_id = ? AND kind = 'battle'`)
			.get(locals.user!.id) as { c: number }
	).c;

	// Per-tag counts for the filter chips.
	const tagCounts: Record<string, number> = {};
	let untagged = 0;
	for (const r of db
		.prepare(`SELECT tags FROM maps WHERE user_id = ? AND kind = 'battle'`)
		.all(locals.user!.id) as { tags: string }[]) {
		if (!r.tags) {
			untagged++;
			continue;
		}
		for (const t of r.tags.split(',')) tagCounts[t] = (tagCounts[t] ?? 0) + 1;
	}

	return { maps, tag, total, filtered, page: Math.min(pageNum, pages), pages, tagCounts, untagged };
}
