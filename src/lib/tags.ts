// Terrain tag vocabulary. KEEP IN SYNC with scripts/lib.mjs (TERRAIN_KEYWORDS).

export const TAGS = [
	'mountain',
	'swamp',
	'forest',
	'dungeon',
	'cave',
	'urban',
	'plains',
	'coast',
	'desert',
	'arctic',
	'ruins'
] as const;

const TERRAIN_KEYWORDS: Record<string, string[]> = {
	mountain: ['mountain', 'cliff', 'peak', 'crag', 'quarry', 'mine', 'mining', 'gravel', 'rocky', 'canyon', 'pass', 'plateau', 'summit'],
	swamp: ['swamp', 'bog', 'marsh', 'mire', 'fen', 'bayou'],
	forest: ['forest', 'wood', 'grove', 'glade', 'jungle', 'thicket', 'oak', 'pine'],
	dungeon: ['dungeon', 'labyrinth', 'crypt', 'tomb', 'catacomb', 'vault', 'prison', 'sewer', 'cell'],
	cave: ['cave', 'cavern', 'grotto', 'lair', 'chasm', 'underdark', 'mineshaft'],
	urban: ['town', 'city', 'street', 'market', 'tavern', 'inn', 'shop', 'house', 'village', 'chapel', 'church', 'mansion', 'warehouse', 'alley', 'plaza', 'guild', 'library', 'academy', 'arena', 'castle', 'keep', 'tower', 'fort'],
	plains: ['field', 'farm', 'meadow', 'plain', 'grassland', 'hill', 'road', 'crossroad', 'camp'],
	coast: ['coast', 'beach', 'shore', 'island', 'ship', 'boat', 'harbor', 'harbour', 'port', 'pier', 'sea', 'ocean', 'lake', 'river', 'bridge', 'waterfall', 'dock'],
	desert: ['desert', 'dune', 'oasis', 'pyramid', 'egyptian', 'wasteland'],
	arctic: ['snow', 'ice', 'frozen', 'winter', 'arctic', 'tundra', 'glacier'],
	ruins: ['ruin', 'ancient', 'abandoned', 'overgrown', 'temple', 'shrine', 'altar']
};

export function inferTags(name: string): string {
	const n = name.toLowerCase();
	const tags: string[] = [];
	for (const [tag, words] of Object.entries(TERRAIN_KEYWORDS)) {
		// Word-boundary match: "peak" must not match inside "speakeasy".
		if (words.some((w) => new RegExp(`\\b${w}`).test(n))) tags.push(tag);
	}
	return tags.join(',');
}

// Battle-extractor environments map straight onto tags (same vocabulary),
// so a battle's environment can pre-filter the map picker.
export function envToTag(env: string | null | undefined): string | null {
	if (!env) return null;
	return (TAGS as readonly string[]).includes(env) ? env : null;
}
