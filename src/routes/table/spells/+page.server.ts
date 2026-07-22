import { db } from '$lib/server/db';
import { seatOf } from '$lib/server/seat';
import { classInfo, maxSpellLevel } from '$lib/classnotes';

// The player's grimoire: only spells their class can reach at their level,
// drawn from the DM's world (shared compendium + the DM's own additions).
export function load({ locals }) {
	const seat = seatOf(locals.user!.id);

	const pc = seat.pcId
		? (db
				.prepare('SELECT class, level FROM pcs WHERE id = ? AND user_id = ?')
				.get(seat.pcId, seat.dmId) as { class: string; level: number } | undefined)
		: undefined;

	const info = classInfo(pc?.class);
	const maxLv = info ? maxSpellLevel(info.caster, pc!.level) : -1;

	const compendiumSize = (
		db
			.prepare('SELECT count(*) c FROM spells WHERE user_id IS NULL OR user_id = ?')
			.get(seat.dmId) as { c: number }
	).c;

	const spells =
		maxLv < 0
			? []
			: (db
					.prepare(
						`SELECT slug, name, level, school, casting_time, range, components, duration,
						        concentration, ritual, data
						 FROM spells
						 WHERE (user_id IS NULL OR user_id = ?)
						   AND level <= ?
						   AND ',' || REPLACE(classes, ' ', '') || ',' LIKE ?
						 ORDER BY level, name`
					)
					.all(seat.dmId, maxLv, `%,${info!.name}%`) as {
					slug: string;
					name: string;
					level: number;
					school: string | null;
					casting_time: string | null;
					range: string | null;
					components: string | null;
					duration: string | null;
					concentration: number;
					ritual: number;
					data: string;
				}[]
			).map((s) => {
				let desc = '';
				let higher = '';
				try {
					const d = JSON.parse(s.data);
					desc = String(d.desc ?? d.description ?? '');
					higher = String(d.higher_level ?? '');
				} catch {
					// malformed import — show the spell without its text
				}
				return {
					slug: s.slug,
					name: s.name,
					level: s.level,
					school: s.school,
					castingTime: s.casting_time,
					range: s.range,
					components: s.components,
					duration: s.duration,
					concentration: !!s.concentration,
					ritual: !!s.ritual,
					desc,
					higher
				};
			});

	return {
		pcClass: info?.name ?? pc?.class ?? null,
		pcLevel: pc?.level ?? null,
		caster: info?.caster ?? 'none',
		maxLv,
		compendiumSize,
		spells
	};
}
