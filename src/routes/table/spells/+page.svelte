<script lang="ts">
	let { data } = $props();

	let q = $state('');
	let open = $state<string | null>(null);

	const shown = $derived(
		data.spells.filter((s) => !q.trim() || s.name.toLowerCase().includes(q.trim().toLowerCase()))
	);
	const levels = $derived([...new Set(shown.map((s) => s.level))].sort((a, b) => a - b));

	function levelName(lv: number) {
		if (lv === 0) return 'Cantrips';
		const ord = lv === 1 ? '1st' : lv === 2 ? '2nd' : lv === 3 ? '3rd' : `${lv}th`;
		return `${ord} Level`;
	}
</script>

<svelte:head><title>Spells · NilBot Tabletop</title></svelte:head>

<header class="top">
	<h1>✦ Spells</h1>
	{#if data.pcClass && data.maxLv >= 0}
		<p class="sub">
			the {data.pcClass}'s reach at level {data.pcLevel} — cantrips through {data.maxLv === 0
				? 'cantrips'
				: `${levelName(data.maxLv).toLowerCase()}`}
		</p>
	{/if}
</header>

{#if data.maxLv < 0}
	<p class="fine">
		{#if data.pcClass}
			The {data.pcClass} channels no spells{#if data.caster === 'half'}&nbsp;yet — half-casters
			awaken at level 2{/if}. Steel and grit will have to do.
		{:else}
			No character bound to your key yet — no grimoire to open.
		{/if}
	</p>
{:else if data.compendiumSize === 0}
	<p class="fine">
		This world's spell compendium is empty — ask your DM to import it
		(<code>node scripts/import-open5e-spells.mjs</code> in the campaign world).
	</p>
{:else}
	<input class="search" bind:value={q} placeholder="Search your spells…" />

	{#each levels as lv (lv)}
		<h2>{levelName(lv)}</h2>
		<div class="list">
			{#each shown.filter((s) => s.level === lv) as s (s.slug)}
				<div class="spell" class:open={open === s.slug}>
					<button class="head" onclick={() => (open = open === s.slug ? null : s.slug)}>
						<b>{s.name}</b>
						<small>
							{#if s.school}{s.school}{/if}
							{#if s.concentration}· concentration{/if}
							{#if s.ritual}· ritual{/if}
						</small>
						<span class="arrow">{open === s.slug ? '▾' : '▸'}</span>
					</button>
					{#if open === s.slug}
						<div class="body">
							<dl>
								{#if s.castingTime}<dt>Casting</dt>
									<dd>{s.castingTime}</dd>{/if}
								{#if s.range}<dt>Range</dt>
									<dd>{s.range}</dd>{/if}
								{#if s.components}<dt>Components</dt>
									<dd>{s.components}</dd>{/if}
								{#if s.duration}<dt>Duration</dt>
									<dd>{s.duration}</dd>{/if}
							</dl>
							{#if s.desc}<p class="desc">{s.desc}</p>{/if}
							{#if s.higher}<p class="desc higher"><b>At higher levels.</b> {s.higher}</p>{/if}
						</div>
					{/if}
				</div>
			{/each}
		</div>
	{/each}

	{#if !shown.length}
		<p class="fine">Nothing matches “{q}”.</p>
	{/if}
{/if}

<style>
	.top {
		margin-bottom: 1.2rem;
	}
	h1 {
		margin: 0;
		font-family: 'VT323', monospace;
		font-size: 2.4rem;
		letter-spacing: 0.05em;
		color: var(--accent);
		text-shadow: 2px 2px 0 #0b0c1e;
	}
	.sub {
		margin: 0.1rem 0 0;
		color: var(--muted);
	}
	.search {
		width: min(420px, 100%);
		margin-bottom: 0.6rem;
	}
	h2 {
		margin: 1.2rem 0 0.5rem;
		font-family: 'VT323', monospace;
		font-size: 1.4rem;
		letter-spacing: 0.08em;
		color: var(--accent);
		text-shadow: 2px 2px 0 #0b0c1e;
	}
	.list {
		display: grid;
		gap: 0.35rem;
		max-width: 760px;
	}
	.spell {
		background: var(--panel);
		border: 1px solid var(--border);
	}
	.spell.open {
		border-color: var(--accent-2);
	}
	.head {
		width: 100%;
		display: flex;
		align-items: center;
		gap: 0.7rem;
		background: transparent;
		border: none;
		color: inherit;
		font: inherit;
		text-align: left;
		padding: 0.5rem 0.8rem;
		cursor: pointer;
	}
	.head b {
		font-family: 'VT323', monospace;
		font-size: 1.15rem;
		letter-spacing: 0.03em;
	}
	.head small {
		color: var(--muted);
	}
	.arrow {
		margin-left: auto;
		color: var(--muted);
	}
	.body {
		padding: 0 0.8rem 0.8rem;
	}
	dl {
		margin: 0 0 0.5rem;
		display: grid;
		grid-template-columns: auto 1fr;
		gap: 0.1rem 0.7rem;
		font-size: 0.85rem;
	}
	dt {
		color: var(--muted);
	}
	dd {
		margin: 0;
	}
	.desc {
		margin: 0 0 0.4rem;
		font-size: 0.9rem;
		line-height: 1.45;
		white-space: pre-wrap;
	}
	.higher {
		color: var(--muted);
	}
	.fine {
		color: var(--muted);
		font-style: italic;
	}
	code {
		background: rgba(160, 140, 199, 0.1);
		padding: 0.05rem 0.35rem;
	}
</style>
