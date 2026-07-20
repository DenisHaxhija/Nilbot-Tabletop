// Shared token appearance helpers (client + server safe).

const TYPE_COLORS: Record<string, string> = {
	aberration: '#8e5aa8',
	beast: '#7a5c3e',
	celestial: '#d4ac0d',
	construct: '#7f8c8d',
	dragon: '#c0392b',
	elemental: '#7a63c8',
	fey: '#58a68f',
	fiend: '#b0413e',
	giant: '#b07d3c',
	humanoid: '#5b7fa6',
	monstrosity: '#a85d4a',
	ooze: '#6aa84f',
	plant: '#4e7d4e',
	undead: '#5d6d5d'
};

export function tokenColor(type: string | null | undefined): string {
	if (!type) return '#666e7a';
	const key = Object.keys(TYPE_COLORS).find((k) => type.toLowerCase().includes(k));
	return key ? TYPE_COLORS[key] : '#666e7a';
}

export function tokenInitials(name: string): string {
	const words = name.replace(/[^\p{L}\p{N} ]/gu, '').split(/\s+/).filter(Boolean);
	if (words.length === 0) return '?';
	if (words.length === 1) return words[0].slice(0, 2);
	return (words[0][0] + words[1][0]).toUpperCase();
}

// Token footprint in grid cells by creature size.
export function tokenCells(size: string | null | undefined): number {
	const s = (size ?? '').toLowerCase();
	if (s.startsWith('l')) return 2;
	if (s.startsWith('h')) return 3;
	if (s.startsWith('g') && !s.startsWith('gn')) return 4; // gargantuan (not "gnome-sized")
	return 1;
}
