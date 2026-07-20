// XP by CR (DMG). Shared by the encounter engine and the sheet builder.
export const XP_BY_CR: Record<number, number> = {
	0: 10, 0.125: 25, 0.25: 50, 0.5: 100,
	1: 200, 2: 450, 3: 700, 4: 1100, 5: 1800, 6: 2300, 7: 2900, 8: 3900,
	9: 5000, 10: 5900, 11: 7200, 12: 8400, 13: 10000, 14: 11500, 15: 13000,
	16: 15000, 17: 18000, 18: 20000, 19: 22000, 20: 25000, 21: 33000,
	22: 41000, 23: 50000, 24: 62000, 25: 75000, 26: 90000, 27: 105000,
	28: 120000, 29: 135000, 30: 155000
};

export function parseCr(text: string | number | null | undefined): number | null {
	if (text === null || text === undefined || text === '') return null;
	const s = String(text).trim();
	if (s.includes('/')) {
		const [a, b] = s.split('/').map(Number);
		return b ? a / b : null;
	}
	const n = Number(s);
	return Number.isFinite(n) ? n : null;
}
