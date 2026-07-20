// 5e has no official magic item prices — these are DMG-guideline defaults
// (typical value within each rarity band), with the standard rule that
// consumables (potions, scrolls, ammunition) cost roughly half.

const BY_RARITY: Record<string, number> = {
	common: 75,
	uncommon: 300,
	rare: 2500,
	'very rare': 25000,
	legendary: 100000
};

export function suggestedPrice(rarity: string | null, type: string | null): string {
	const r = (rarity ?? '').toLowerCase().trim();
	if (r === 'artifact') return 'priceless';
	const base = BY_RARITY[r];
	if (!base) return '';
	const t = (type ?? '').toLowerCase();
	const consumable = /potion|scroll|ammunition|elixir|philter|oil \(|dust|bead of/.test(t);
	const value = consumable ? Math.round(base / 2) : base;
	return `${value.toLocaleString('en-US')} gp`;
}
