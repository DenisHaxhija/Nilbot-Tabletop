<script lang="ts">
	// Structured hand-editing for a builder stat sheet. Mutates the bound
	// object directly, so the StatBlock preview follows live.
	let { sheet = $bindable() }: { sheet: any } = $props();

	const SIZES = ['Tiny', 'Small', 'Medium', 'Large', 'Huge', 'Gargantuan'];
	const ABILITIES = [
		['strength', 'STR'],
		['dexterity', 'DEX'],
		['constitution', 'CON'],
		['intelligence', 'INT'],
		['wisdom', 'WIS'],
		['charisma', 'CHA']
	] as const;
	const LISTS = [
		['special_abilities', 'Special abilities'],
		['actions', 'Actions'],
		['bonus_actions', 'Bonus actions'],
		['reactions', 'Reactions'],
		['legendary_actions', 'Legendary actions']
	] as const;

	// speed/skills are objects ({walk: 30}, {perception: 4}) — edited as
	// "walk 30, fly 60" style text, parsed on input. Local drafts so typing
	// isn't reformatted mid-keystroke.
	function pairsToText(obj: unknown): string {
		if (!obj || typeof obj !== 'object') return '';
		return Object.entries(obj as Record<string, unknown>)
			.map(([k, v]) => `${k} ${v}`)
			.join(', ');
	}
	function textToPairs(text: string): Record<string, number> {
		const out: Record<string, number> = {};
		for (const m of text.matchAll(/([a-zA-Z_ ]+?)\s+(-?\d+)/g)) {
			out[m[1].trim().toLowerCase()] = Number(m[2]);
		}
		return out;
	}
	let speedDraft = $state(pairsToText(sheet.speed));
	let skillsDraft = $state(pairsToText(sheet.skills));

	function addEntry(key: string) {
		if (!Array.isArray(sheet[key])) sheet[key] = [];
		sheet[key].push({ name: '', desc: '' });
	}
	function removeEntry(key: string, i: number) {
		sheet[key].splice(i, 1);
	}
</script>

<div class="editor">
	<div class="cols">
		<label>Name <input bind:value={sheet.name} /></label>
		<label>
			Size
			<select bind:value={sheet.size}>
				{#each SIZES as s (s)}<option value={s}>{s}</option>{/each}
			</select>
		</label>
		<label>Type <input bind:value={sheet.type} placeholder="humanoid, fiend…" /></label>
		<label>Alignment <input bind:value={sheet.alignment} /></label>
		<label>CR <input bind:value={sheet.challenge_rating} placeholder="1/4, 5…" /></label>
		<label>AC <input type="number" bind:value={sheet.armor_class} /></label>
		<label>Armor desc <input bind:value={sheet.armor_desc} placeholder="natural armor" /></label>
		<label>HP <input type="number" bind:value={sheet.hit_points} /></label>
		<label>Hit dice <input bind:value={sheet.hit_dice} placeholder="8d8+16" /></label>
	</div>

	<label>
		Speed <small>(e.g. walk 30, fly 60)</small>
		<input bind:value={speedDraft} oninput={() => (sheet.speed = textToPairs(speedDraft))} />
	</label>

	<div class="abilities">
		{#each ABILITIES as [key, label] (key)}
			<label class="ab">{label} <input type="number" bind:value={sheet[key]} /></label>
		{/each}
	</div>

	<label>
		Skills <small>(e.g. perception 4, stealth 7)</small>
		<input bind:value={skillsDraft} oninput={() => (sheet.skills = textToPairs(skillsDraft))} />
	</label>

	<div class="cols">
		<label>Vulnerabilities <input bind:value={sheet.damage_vulnerabilities} /></label>
		<label>Resistances <input bind:value={sheet.damage_resistances} /></label>
		<label>Damage immunities <input bind:value={sheet.damage_immunities} /></label>
		<label>Condition immunities <input bind:value={sheet.condition_immunities} /></label>
		<label>Senses <input bind:value={sheet.senses} /></label>
		<label>Languages <input bind:value={sheet.languages} /></label>
	</div>

	{#each LISTS as [key, label] (key)}
		<div class="list">
			<div class="list-head">
				<span>{label}</span>
				<button type="button" class="add" onclick={() => addEntry(key)}>＋ add</button>
			</div>
			{#each sheet[key] ?? [] as entry, i (i)}
				<div class="entry">
					<div class="entry-head">
						<input class="entry-name" bind:value={entry.name} placeholder="Name" />
						<button type="button" class="rm" title="Remove" onclick={() => removeEntry(key, i)}
							>✕</button
						>
					</div>
					<textarea bind:value={entry.desc} rows="2" placeholder="Description"></textarea>
				</div>
			{/each}
		</div>
	{/each}

	{#if Array.isArray(sheet.legendary_actions) && sheet.legendary_actions.length}
		<label>Legendary intro <textarea bind:value={sheet.legendary_desc} rows="2"></textarea></label>
	{/if}
</div>

<style>
	.editor {
		display: grid;
		gap: 0.8rem;
		background: var(--panel);
		border: 1px solid var(--border);
		border-radius: 10px;
		padding: 1rem 1.1rem;
	}
	.cols {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
		gap: 0.6rem;
	}
	label {
		display: grid;
		gap: 0.2rem;
		font-size: 0.82rem;
		color: var(--muted);
	}
	label small {
		opacity: 0.75;
	}
	input,
	select,
	textarea {
		font: inherit;
		font-size: 0.88rem;
	}
	textarea {
		resize: vertical;
		line-height: 1.45;
	}
	.abilities {
		display: grid;
		grid-template-columns: repeat(6, 1fr);
		gap: 0.5rem;
	}
	.ab input {
		width: 100%;
		box-sizing: border-box;
		text-align: center;
	}
	.list {
		display: grid;
		gap: 0.5rem;
		border-top: 1px solid var(--border);
		padding-top: 0.6rem;
	}
	.list-head {
		display: flex;
		justify-content: space-between;
		align-items: center;
		font-size: 0.85rem;
		color: var(--accent);
	}
	.add {
		font-size: 0.78rem;
		padding: 0.15rem 0.5rem;
	}
	.entry {
		display: grid;
		gap: 0.3rem;
	}
	.entry-head {
		display: flex;
		gap: 0.3rem;
	}
	.entry-name {
		flex: 1;
	}
	.rm {
		background: transparent;
		border: none;
		color: var(--muted);
		padding: 0 0.3rem;
	}
	.rm:hover {
		color: var(--danger);
	}
</style>
