// The class ledger — SRD facts used to auto-forge a sheet when an invite is
// cut, and to show players what their class is about. Shared client/server.

export type CasterKind = 'full' | 'half' | 'pact' | 'none';

export interface Stats {
	str: number;
	dex: number;
	con: number;
	intel: number;
	wis: number;
	cha: number;
}

export interface ClassInfo {
	name: string;
	hitDie: string;
	primary: string;
	saves: string;
	caster: CasterKind;
	gold: number;
	kit: string[];
	stats: Stats;
	blurb: string;
}

export const DEFAULT_STATS: Stats = { str: 10, dex: 10, con: 10, intel: 10, wis: 10, cha: 10 };

// Standard array (15 14 13 12 10 8) laid out the way each class wants it,
// plus the SRD starting kit and average starting gold.
export const CLASSES: ClassInfo[] = [
	{
		name: 'Barbarian', hitDie: 'd12', primary: 'Strength', saves: 'STR & CON', caster: 'none', gold: 50,
		kit: ['Greataxe', 'Two handaxes', 'Four javelins', "Explorer's pack"],
		stats: { str: 15, dex: 13, con: 14, intel: 8, wis: 12, cha: 10 },
		blurb: 'A fierce warrior who channels rage into raw battle fury.'
	},
	{
		name: 'Bard', hitDie: 'd8', primary: 'Charisma', saves: 'DEX & CHA', caster: 'full', gold: 125,
		kit: ['Rapier', 'Dagger', 'Lute', 'Leather armor', "Entertainer's pack"],
		stats: { str: 8, dex: 14, con: 13, intel: 12, wis: 10, cha: 15 },
		blurb: 'A magical entertainer whose music weaves spells and stirs hearts.'
	},
	{
		name: 'Cleric', hitDie: 'd8', primary: 'Wisdom', saves: 'WIS & CHA', caster: 'full', gold: 125,
		kit: ['Mace', 'Scale mail', 'Shield', 'Holy symbol', "Priest's pack"],
		stats: { str: 13, dex: 10, con: 14, intel: 8, wis: 15, cha: 12 },
		blurb: 'A divine champion wielding the power of the gods.'
	},
	{
		name: 'Druid', hitDie: 'd8', primary: 'Wisdom', saves: 'INT & WIS', caster: 'full', gold: 50,
		kit: ['Scimitar', 'Wooden shield', 'Leather armor', 'Druidic focus', "Explorer's pack"],
		stats: { str: 8, dex: 13, con: 14, intel: 12, wis: 15, cha: 10 },
		blurb: 'A keeper of the old ways, drawing magic from nature itself.'
	},
	{
		name: 'Fighter', hitDie: 'd10', primary: 'Strength or Dexterity', saves: 'STR & CON', caster: 'none', gold: 125,
		kit: ['Chain mail', 'Longsword', 'Shield', 'Light crossbow & 20 bolts', "Dungeoneer's pack"],
		stats: { str: 15, dex: 13, con: 14, intel: 8, wis: 12, cha: 10 },
		blurb: 'A master of weapons and armor, at home in every battle.'
	},
	{
		name: 'Monk', hitDie: 'd8', primary: 'Dexterity & Wisdom', saves: 'STR & DEX', caster: 'none', gold: 12,
		kit: ['Shortsword', '10 darts', "Dungeoneer's pack"],
		stats: { str: 12, dex: 15, con: 13, intel: 10, wis: 14, cha: 8 },
		blurb: 'A martial artist whose discipline turns body into weapon.'
	},
	{
		name: 'Paladin', hitDie: 'd10', primary: 'Strength & Charisma', saves: 'WIS & CHA', caster: 'half', gold: 125,
		kit: ['Chain mail', 'Longsword', 'Shield', 'Five javelins', 'Holy symbol', "Priest's pack"],
		stats: { str: 15, dex: 10, con: 13, intel: 8, wis: 12, cha: 14 },
		blurb: 'A holy knight bound by sacred oath, sword and spell in hand.'
	},
	{
		name: 'Ranger', hitDie: 'd10', primary: 'Dexterity & Wisdom', saves: 'STR & DEX', caster: 'half', gold: 125,
		kit: ['Scale mail', 'Two shortswords', 'Longbow & quiver of 20 arrows', "Explorer's pack"],
		stats: { str: 12, dex: 15, con: 13, intel: 10, wis: 14, cha: 8 },
		blurb: 'A hunter of the wilds, deadly at range and wise to the land.'
	},
	{
		name: 'Rogue', hitDie: 'd8', primary: 'Dexterity', saves: 'DEX & INT', caster: 'none', gold: 100,
		kit: ['Rapier', 'Shortbow & 20 arrows', 'Leather armor', 'Two daggers', "Thieves' tools", "Burglar's pack"],
		stats: { str: 8, dex: 15, con: 13, intel: 14, wis: 12, cha: 10 },
		blurb: 'A shadow-walker who strikes where the armor is thinnest.'
	},
	{
		name: 'Sorcerer', hitDie: 'd6', primary: 'Charisma', saves: 'CON & CHA', caster: 'full', gold: 75,
		kit: ['Light crossbow & 20 bolts', 'Arcane focus', 'Two daggers', "Dungeoneer's pack"],
		stats: { str: 8, dex: 13, con: 14, intel: 12, wis: 10, cha: 15 },
		blurb: 'A wielder of magic born in the blood, raw and untamed.'
	},
	{
		name: 'Warlock', hitDie: 'd8', primary: 'Charisma', saves: 'WIS & CHA', caster: 'pact', gold: 100,
		kit: ['Light crossbow & 20 bolts', 'Arcane focus', 'Leather armor', 'Two daggers', "Scholar's pack"],
		stats: { str: 8, dex: 13, con: 14, intel: 12, wis: 10, cha: 15 },
		blurb: 'A seeker of forbidden power, bound by pact to an otherworldly patron.'
	},
	{
		name: 'Wizard', hitDie: 'd6', primary: 'Intelligence', saves: 'INT & WIS', caster: 'full', gold: 100,
		kit: ['Quarterstaff', 'Arcane focus', 'Spellbook', "Scholar's pack"],
		stats: { str: 8, dex: 13, con: 14, intel: 15, wis: 12, cha: 10 },
		blurb: 'A scholar of the arcane whose spellbook holds the keys to reality.'
	}
];

export function classInfo(name: string | null | undefined): ClassInfo | null {
	if (!name) return null;
	const n = name.trim().toLowerCase();
	return CLASSES.find((c) => c.name.toLowerCase() === n) ?? null;
}

// Highest spell level a character of this class & level can cast.
// Full/pact casters: 1st at level 1 up to 9th; half casters: 1st at level 2
// up to 5th; non-casters: none (-1, so even cantrips stay hidden).
export function maxSpellLevel(caster: CasterKind, level: number): number {
	if (caster === 'none') return -1;
	if (caster === 'half') return level < 2 ? -1 : Math.min(5, Math.ceil(level / 4));
	return Math.min(9, Math.ceil(level / 2));
}

export function mod(score: number): string {
	const m = Math.floor((score - 10) / 2);
	return m >= 0 ? `+${m}` : `−${Math.abs(m)}`;
}
