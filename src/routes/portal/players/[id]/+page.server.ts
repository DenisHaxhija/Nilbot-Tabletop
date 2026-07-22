import { error } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { classInfo } from '$lib/classnotes';

function parseList(raw: string): string[] {
	try {
		const v = JSON.parse(raw);
		return Array.isArray(v) ? v.map(String) : [];
	} catch {
		return [];
	}
}

export function load({ params, locals }) {
	const uid = locals.user!.id;
	const p = db
		.prepare('SELECT * FROM pcs WHERE id = ? AND user_id = ?')
		.get(Number(params.id), uid) as
		| {
				id: number;
				name: string;
				class: string;
				file: string | null;
				gold: number;
				conditions: string;
				level: number;
				str: number;
				dex: number;
				con: number;
				intel: number;
				wis: number;
				cha: number;
				items: string;
				spells: string;
				backstory: string;
				sheet_slug: string | null;
		  }
		| undefined;
	if (!p) error(404, 'This adventurer is not in your party.');

	// Spell suggestions for the grant box — the compendium narrowed to the
	// character's class (all levels; the DM decides what they get).
	const info = classInfo(p.class);
	const spellOptions = info
		? (db
				.prepare(
					`SELECT name, level FROM spells
					 WHERE (user_id IS NULL OR user_id = ?)
					   AND ',' || REPLACE(classes, ' ', '') || ',' LIKE ?
					 ORDER BY level, name`
				)
				.all(uid, `%,${info.name}%`) as { name: string; level: number }[])
		: [];

	return {
		pc: {
			id: p.id,
			name: p.name,
			class: p.class,
			img: p.file ? `/api/pcs/${p.id}` : null,
			gold: p.gold,
			conditions: p.conditions.split(',').filter(Boolean),
			level: p.level,
			stats: { str: p.str, dex: p.dex, con: p.con, intel: p.intel, wis: p.wis, cha: p.cha },
			items: parseList(p.items),
			spells: parseList(p.spells),
			backstory: p.backstory,
			sheetSlug: p.sheet_slug
		},
		spellOptions
	};
}
