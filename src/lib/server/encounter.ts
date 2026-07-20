import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { db } from './db';

const execFileP = promisify(execFile);

// --- Deterministic encounter math (DMG 2014) ---------------------------------

// XP thresholds per character level: [easy, medium, hard, deadly]
const THRESHOLDS: Record<number, [number, number, number, number]> = {
	1: [25, 50, 75, 100], 2: [50, 100, 150, 200], 3: [75, 150, 225, 400],
	4: [125, 250, 375, 500], 5: [250, 500, 750, 1100], 6: [300, 600, 900, 1400],
	7: [350, 750, 1100, 1700], 8: [450, 900, 1400, 2100], 9: [550, 1100, 1600, 2400],
	10: [600, 1200, 1900, 2800], 11: [800, 1600, 2400, 3600], 12: [1000, 2000, 3000, 4500],
	13: [1100, 2200, 3400, 5100], 14: [1250, 2500, 3800, 5700], 15: [1400, 2800, 4300, 6400],
	16: [1600, 3200, 4800, 7200], 17: [2000, 3900, 5900, 8800], 18: [2100, 4200, 6300, 9500],
	19: [2400, 4900, 7300, 10900], 20: [2800, 5700, 8500, 12700]
};

function multiplier(count: number): number {
	if (count <= 1) return 1;
	if (count === 2) return 1.5;
	if (count <= 6) return 2;
	if (count <= 10) return 2.5;
	if (count <= 14) return 3;
	return 4;
}

export interface MatchedCreature {
	requested: string;
	count: number;
	matched: boolean;
	slug?: string;
	name?: string;
	cr_text?: string | null;
	xp?: number | null;
}

export interface EncounterSuggestion {
	title: string;
	description: string;
	environment: string;
	creatures: MatchedCreature[];
	totalXp: number;
	adjustedXp: number;
	difficulty: string;
	thresholds: { easy: number; medium: number; hard: number; deadly: number };
	partyLevel: number;
	partySize: number;
}

function difficultyFor(adjustedXp: number, partyLevel: number, partySize: number) {
	const t = THRESHOLDS[Math.min(20, Math.max(1, partyLevel))];
	const thresholds = {
		easy: t[0] * partySize,
		medium: t[1] * partySize,
		hard: t[2] * partySize,
		deadly: t[3] * partySize
	};
	let difficulty = 'trivial';
	if (adjustedXp >= thresholds.deadly) difficulty = 'deadly';
	else if (adjustedXp >= thresholds.hard) difficulty = 'hard';
	else if (adjustedXp >= thresholds.medium) difficulty = 'medium';
	else if (adjustedXp >= thresholds.easy) difficulty = 'easy';
	return { difficulty, thresholds };
}

// --- Creature name → local bestiary match ------------------------------------

function matchCreature(name: string, userId: number) {
	const exact = db
		.prepare(
			`SELECT slug, name, cr_text, xp FROM monsters
			 WHERE lower(name) = lower(?) AND (user_id IS NULL OR user_id = ?)
			 ORDER BY CASE layer WHEN 'user' THEN 0 ELSE 1 END LIMIT 1`
		)
		.get(name, userId) as { slug: string; name: string; cr_text: string | null; xp: number | null } | undefined;
	if (exact) return exact;

	const fts = name
		.trim()
		.split(/\s+/)
		.map((t) => `"${t.replace(/"/g, '')}"*`)
		.join(' ');
	try {
		return db
			.prepare(
				`SELECT m.slug, m.name, m.cr_text, m.xp FROM monsters m
				 WHERE m.id IN (SELECT rowid FROM monsters_fts WHERE monsters_fts MATCH ?)
				 AND (m.user_id IS NULL OR m.user_id = ?)
				 ORDER BY length(m.name) LIMIT 1`
			)
			.get(fts, userId) as { slug: string; name: string; cr_text: string | null; xp: number | null } | undefined;
	} catch {
		return undefined;
	}
}

// --- LLM extraction via the user's Claude subscription (claude CLI) ----------

interface RawEncounter {
	title?: string;
	description?: string;
	environment?: string;
	creatures?: { name?: string; count?: number }[];
}

async function extractWithClaude(notes: string): Promise<RawEncounter[]> {
	const prompt = `You are an encounter-extraction engine for a D&D 5e DM tool.
Read the session notes below and identify every combat encounter the DM is planning or implying.
For each, suggest concrete 5e monsters (use standard 5e monster names, e.g. "Goblin", "Bandit Captain", "Giant Spider") and sensible counts based on the notes.

Respond with ONLY a JSON array, no prose, no markdown fences, in this exact shape:
[{"title": "short encounter name", "description": "one sentence on where/why it happens", "environment": "swamp", "creatures": [{"name": "Monster Name", "count": 3}]}]

"environment" must be exactly one of: swamp, forest, dungeon, cave, urban, plains, mountain, coast, desert, arctic — pick whichever best matches where the fight happens.

If the notes imply no combat at all, respond with [].

SESSION NOTES:
---
${notes}
---`;

	const { stdout } = await execFileP('claude', ['-p', prompt, '--output-format', 'json'], {
		timeout: 180_000,
		maxBuffer: 10 * 1024 * 1024
	});
	const envelope = JSON.parse(stdout);
	let text: string = envelope.result ?? '';
	text = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/, '');
	const start = text.indexOf('[');
	const end = text.lastIndexOf(']');
	if (start === -1 || end === -1) return [];
	return JSON.parse(text.slice(start, end + 1));
}

// --- Public API --------------------------------------------------------------

export async function suggestEncounters(
	notes: string,
	partyLevel: number,
	partySize: number,
	userId: number
): Promise<EncounterSuggestion[]> {
	const raw = await extractWithClaude(notes);
	return raw.map((enc) => {
		const creatures: MatchedCreature[] = (enc.creatures ?? [])
			.filter((c) => c.name)
			.map((c) => {
				const count = Math.max(1, Number(c.count) || 1);
				const hit = matchCreature(c.name!, userId);
				return hit
					? { requested: c.name!, count, matched: true, ...hit }
					: { requested: c.name!, count, matched: false };
			});

		const totalXp = creatures.reduce((sum, c) => sum + (c.xp ?? 0) * c.count, 0);
		const totalCount = creatures.reduce((sum, c) => sum + c.count, 0);
		const adjustedXp = Math.round(totalXp * multiplier(totalCount));
		const { difficulty, thresholds } = difficultyFor(adjustedXp, partyLevel, partySize);

		return {
			title: enc.title ?? 'Encounter',
			description: enc.description ?? '',
			environment: enc.environment ?? 'plains',
			creatures,
			totalXp,
			adjustedXp,
			difficulty,
			thresholds,
			partyLevel,
			partySize
		};
	});
}
