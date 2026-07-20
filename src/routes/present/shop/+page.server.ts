import { db } from '$lib/server/db';

export function load({ locals }) {
	const stock = db
		.prepare(
			`SELECT i.id, i.name, i.type, i.rarity, i.attunement, s.price
			 FROM shop_stock s JOIN items i ON i.id = s.item_id
			 WHERE s.user_id = ? ORDER BY i.name`
		)
		.all(locals.user!.id) as {
		id: number;
		name: string;
		type: string | null;
		rarity: string | null;
		attunement: string;
		price: string;
	}[];
	return { stock };
}
