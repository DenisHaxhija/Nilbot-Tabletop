<script lang="ts">
	import Token from '$lib/components/Token.svelte';

	let { meta, monster }: { meta: any; monster: any } = $props();

	const m = $derived(monster);
	const is5etools = $derived(m.format === '5etools');

	function mod(score: number | undefined): string {
		if (typeof score !== 'number') return '—';
		const v = Math.floor((score - 10) / 2);
		return `${score} (${v >= 0 ? '+' : ''}${v})`;
	}
	function speedText(speed: unknown): string {
		if (!speed || typeof speed !== 'object') return String(speed ?? '—');
		return Object.entries(speed as Record<string, unknown>)
			.filter(([, v]) => v !== false && v !== undefined)
			.map(([k, v]) => (k === 'walk' ? `${v} ft.` : `${k} ${v}${typeof v === 'number' ? ' ft.' : ''}`))
			.join(', ');
	}
	function skillsText(skills: unknown): string {
		if (!skills || typeof skills !== 'object') return '';
		return Object.entries(skills as Record<string, number>)
			.map(([k, v]) => `${k[0].toUpperCase()}${k.slice(1)} ${v >= 0 ? '+' : ''}${v}`)
			.join(', ');
	}

	const abilities = $derived(
		is5etools
			? [m.str, m.dex, m.con, m.int, m.wis, m.cha]
			: [m.strength, m.dexterity, m.constitution, m.intelligence, m.wisdom, m.charisma]
	);
	type Trait = { name: string; desc?: string; entries?: unknown[] };
	function traitDesc(t: Trait): string {
		if (t.desc) return t.desc;
		if (Array.isArray(t.entries)) return t.entries.filter((e) => typeof e === 'string').join('\n');
		return '';
	}
	const sections = $derived(
		[
			{ title: 'Traits', items: (is5etools ? m.trait : m.special_abilities) ?? [] },
			{ title: 'Actions', items: (is5etools ? m.action : m.actions) ?? [] },
			{ title: 'Bonus Actions', items: (is5etools ? m.bonus : m.bonus_actions) ?? [] },
			{ title: 'Reactions', items: (is5etools ? m.reaction : m.reactions) ?? [] },
			{ title: 'Legendary Actions', items: (is5etools ? m.legendary : m.legendary_actions) ?? [] }
		].filter((s) => Array.isArray(s.items) && s.items.length)
	);
</script>

<article class="statblock">
	<header class="head-row">
		<Token name={meta.name} type={meta.type} px={56} img={meta.img} />
		<div>
			<h1>{meta.name}</h1>
			<p class="sub">
				{meta.size ?? ''}
				{meta.type ?? ''}{meta.alignment ? `, ${meta.alignment}` : ''}
			</p>
			<p class="src">{meta.source} {meta.layer === 'user' ? '(imported)' : ''}</p>
		</div>
	</header>

	<div class="vitals">
		<div><b>Armor Class</b> {meta.ac ?? '—'} {!is5etools && m.armor_desc ? `(${m.armor_desc})` : ''}</div>
		<div><b>Hit Points</b> {meta.hp ?? '—'} {!is5etools && m.hit_dice ? `(${m.hit_dice})` : ''}</div>
		<div><b>Speed</b> {speedText(m.speed)}</div>
		<div>
			<b>CR</b>
			{meta.cr_text ?? '—'}{meta.xp ? ` (${meta.xp.toLocaleString()} XP)` : ''}
		</div>
	</div>

	<table class="abilities">
		<thead><tr><th>STR</th><th>DEX</th><th>CON</th><th>INT</th><th>WIS</th><th>CHA</th></tr></thead>
		<tbody>
			<tr>
				{#each abilities as a, i (i)}
					<td>{mod(a)}</td>
				{/each}
			</tr>
		</tbody>
	</table>

	{#if !is5etools}
		<div class="lines">
			{#if skillsText(m.skills)}<div><b>Skills</b> {skillsText(m.skills)}</div>{/if}
			{#if m.damage_vulnerabilities}<div><b>Vulnerabilities</b> {m.damage_vulnerabilities}</div>{/if}
			{#if m.damage_resistances}<div><b>Resistances</b> {m.damage_resistances}</div>{/if}
			{#if m.damage_immunities}<div><b>Damage Immunities</b> {m.damage_immunities}</div>{/if}
			{#if m.condition_immunities}<div><b>Condition Immunities</b> {m.condition_immunities}</div>{/if}
			{#if m.senses}<div><b>Senses</b> {m.senses}</div>{/if}
			{#if m.languages}<div><b>Languages</b> {m.languages}</div>{/if}
		</div>
	{/if}

	{#each sections as s (s.title)}
		<section>
			<h2>{s.title}</h2>
			{#each s.items as t (t.name)}
				<p><b><i>{t.name}.</i></b> {traitDesc(t)}</p>
			{/each}
		</section>
	{/each}

	{#if !is5etools && m.legendary_desc}
		<p class="legendary-desc">{m.legendary_desc}</p>
	{/if}
</article>

<style>
	.statblock {
		background: var(--panel);
		border: 1px solid var(--border);
		border-top: 3px solid var(--accent-2);
		border-radius: 8px;
		padding: 1.25rem 1.5rem;
	}
	.head-row {
		display: flex;
		align-items: center;
		gap: 0.9rem;
	}
	h1 {
		margin: 0;
		color: var(--accent);
		font-variant: small-caps;
	}
	.sub {
		margin: 0;
		font-style: italic;
		color: var(--muted);
	}
	.src {
		margin: 0.15rem 0 0;
		font-size: 0.8rem;
		color: var(--muted);
	}
	.vitals {
		border-block: 1px solid var(--accent-2);
		margin: 0.75rem 0;
		padding: 0.5rem 0;
		display: grid;
		gap: 0.15rem;
	}
	.abilities {
		width: 100%;
		text-align: center;
		border-collapse: collapse;
		margin-bottom: 0.75rem;
	}
	.abilities th {
		color: var(--accent);
	}
	.lines {
		display: grid;
		gap: 0.15rem;
		border-bottom: 1px solid var(--accent-2);
		padding-bottom: 0.6rem;
		margin-bottom: 0.6rem;
		font-size: 0.95rem;
	}
	section h2 {
		color: var(--accent);
		border-bottom: 1px solid var(--border);
		font-size: 1.15rem;
		font-variant: small-caps;
		margin-bottom: 0.4rem;
	}
	section p {
		white-space: pre-wrap;
		margin: 0.4rem 0;
	}
	.legendary-desc {
		color: var(--muted);
		font-style: italic;
	}
</style>
