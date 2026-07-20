import { db } from '$lib/server/db';
import { suggestedPrice } from '$lib/prices';

const PAGE_SIZE = 50;

// Category chips → type-prefix matches on the Open5e "type" field.
const CATEGORIES: Record<string, string[]> = {
	weapon: ['Weapon%'],
	armor: ['Armor%', 'Shield%'],
	ring: ['Ring%'],
	potion: ['Potion%'],
	scroll: ['Scroll%'],
	'wand & staff': ['Wand%', 'Staff%', 'Rod%'],
	wondrous: ['Wondrous%']
};

export function load({ url, locals }) {
	const uid = locals.user!.id;
	const q = url.searchParams.get('q') ?? '';
	const rarity = url.searchParams.get('rarity') ?? '';
	const cat = url.searchParams.get('cat') ?? '';
	const pageNum = Math.max(1, Number(url.searchParams.get('page') ?? 1));

	const where: string[] = ['(i.user_id IS NULL OR i.user_id = ?)'];
	const params: unknown[] = [uid];
	if (q.trim()) {
		where.push('i.name LIKE ?');
		params.push(`%${q.trim()}%`);
	}
	if (rarity) {
		where.push('i.rarity = ?');
		params.push(rarity);
	}
	if (cat && CATEGORIES[cat]) {
		where.push(`(${CATEGORIES[cat].map(() => 'i.type LIKE ?').join(' OR ')})`);
		params.push(...CATEGORIES[cat]);
	}
	const whereSql = where.join(' AND ');

	const total = (
		db.prepare(`SELECT count(*) c FROM items i WHERE ${whereSql}`).get(...params) as { c: number }
	).c;
	const items = db
		.prepare(
			`SELECT i.*, s.price AS stock_price, s.item_id IS NOT NULL AS stocked
			 FROM items i LEFT JOIN shop_stock s ON s.item_id = i.id AND s.user_id = ?
			 WHERE ${whereSql} ORDER BY i.name LIMIT ? OFFSET ?`
		)
		.all(uid, ...params, PAGE_SIZE, (pageNum - 1) * PAGE_SIZE) as any[];

	const stocked = db
		.prepare(
			`SELECT i.id, i.name, i.type, i.rarity, i.attunement, s.price
			 FROM shop_stock s JOIN items i ON i.id = s.item_id
			 WHERE s.user_id = ? ORDER BY i.name`
		)
		.all(uid) as any[];

	const rarities = db
		.prepare(
			`SELECT DISTINCT rarity FROM items WHERE rarity IS NOT NULL AND (user_id IS NULL OR user_id = ?) ORDER BY rarity`
		)
		.all(uid)
		.map((r: any) => r.rarity as string);

	return {
		items: items.map((i) => ({
			id: i.id,
			name: i.name,
			type: i.type,
			rarity: i.rarity,
			attunement: i.attunement,
			desc: i.desc,
			source: i.source,
			custom: i.user_id !== null,
			stocked: !!i.stocked,
			price: i.stock_price ?? '',
			suggested: suggestedPrice(i.rarity, i.type)
		})),
		stocked,
		total,
		page: pageNum,
		pages: Math.max(1, Math.ceil(total / PAGE_SIZE)),
		filters: { q, rarity, cat },
		categories: Object.keys(CATEGORIES),
		rarities
	};
}
