import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileP = promisify(execFile);

const SCHEMA = `{
  "name": "string",
  "size": "Tiny|Small|Medium|Large|Huge|Gargantuan",
  "type": "lowercase creature type (humanoid, fiend, undead, beast, ...)",
  "alignment": "string",
  "armor_class": number,
  "armor_desc": "string or null",
  "hit_points": number,
  "hit_dice": "e.g. 8d8+16",
  "speed": {"walk": 30, "swim": 20, "fly": 60},
  "strength": number, "dexterity": number, "constitution": number,
  "intelligence": number, "wisdom": number, "charisma": number,
  "skills": {"perception": 4},
  "damage_vulnerabilities": "string or empty",
  "damage_resistances": "string or empty",
  "damage_immunities": "string or empty",
  "condition_immunities": "string or empty",
  "senses": "e.g. darkvision 60 ft., passive Perception 14",
  "languages": "string",
  "challenge_rating": "string like 1/4 or 5",
  "special_abilities": [{"name": "string", "desc": "string"}],
  "actions": [{"name": "string", "desc": "string"}],
  "bonus_actions": [],
  "reactions": [],
  "legendary_desc": "",
  "legendary_actions": []
}`;

export async function generateSheet(
	description: string,
	current: unknown | null,
	feedback: string | null
): Promise<Record<string, unknown>> {
	let prompt: string;
	if (current && feedback) {
		prompt = `You are a D&D 5e monster and NPC designer. Here is a stat block you previously created:

${JSON.stringify(current, null, 2)}

The DM wants these changes:
---
${feedback}
---

Apply the changes (rebalancing dependent numbers where it makes sense) and respond with ONLY the complete revised JSON stat block, no prose, no markdown fences. Keep the exact same JSON schema.`;
	} else {
		prompt = `You are a D&D 5e monster and NPC designer. Create a complete, mechanically sound and balanced 5e stat block from this description written by a DM:

---
${description}
---

Pick an appropriate challenge rating for how the character is described. Give it flavorful ability names. Respond with ONLY a JSON object in exactly this schema (Open5e style), no prose, no markdown fences:

${SCHEMA}`;
	}

	const { stdout } = await execFileP('claude', ['-p', prompt, '--output-format', 'json'], {
		timeout: 180_000,
		maxBuffer: 10 * 1024 * 1024
	});
	const envelope = JSON.parse(stdout);
	let text: string = envelope.result ?? '';
	text = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/, '');
	const start = text.indexOf('{');
	const end = text.lastIndexOf('}');
	if (start === -1 || end === -1) throw new Error('Model returned no JSON.');
	return JSON.parse(text.slice(start, end + 1));
}
