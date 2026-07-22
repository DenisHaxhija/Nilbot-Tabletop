<script lang="ts">
	import { mod } from '$lib/classnotes';
	let { data } = $props();

	const STATS: { key: 'str' | 'dex' | 'con' | 'intel' | 'wis' | 'cha'; label: string }[] = [
		{ key: 'str', label: 'STR' },
		{ key: 'dex', label: 'DEX' },
		{ key: 'con', label: 'CON' },
		{ key: 'intel', label: 'INT' },
		{ key: 'wis', label: 'WIS' },
		{ key: 'cha', label: 'CHA' }
	];
</script>

<svelte:head><title>My Sheet · NilBot Tabletop</title></svelte:head>

{#if data.me}
	<header class="top">
		<h1>{data.me.name}</h1>
		<p class="sub">
			{#if data.me.class}{data.me.class} ·{/if} level {data.me.level}
		</p>
	</header>

	<div class="statrow">
		{#each STATS as s (s.key)}
			<div class="stat">
				<span class="s-lbl">{s.label}</span>
				<span class="s-val">{data.me.stats[s.key]}</span>
				<span class="s-mod">{mod(data.me.stats[s.key])}</span>
			</div>
		{/each}
	</div>

	<div class="grid">
		<section class="panel">
			<h2>Coin</h2>
			<p class="purse">🪙 {data.me.gold} gold</p>
		</section>

		<section class="panel">
			<h2>Conditions</h2>
			{#if data.me.conditions.length}
				<div class="chips">
					{#each data.me.conditions as c (c)}
						<span class="chip">{c}</span>
					{/each}
				</div>
			{:else}
				<p class="fine">unafflicted — for now</p>
			{/if}
		</section>

		<section class="panel wide">
			<h2>Items</h2>
			{#if data.me.items.length}
				<ul class="items">
					{#each data.me.items as it, i (i)}
						<li>{it}</li>
					{/each}
				</ul>
			{:else}
				<p class="fine">empty-handed — your DM holds the purse strings</p>
			{/if}
		</section>
	</div>
	<p class="whisper">Your DM shapes this sheet from their Portal — what you see is live.</p>
{:else}
	<header class="top">
		<h1>{data.playerName}</h1>
		<p class="sub">no character yet</p>
	</header>
	<p class="fine">Your DM hasn't bound a character to your key yet — pester them.</p>
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
	.statrow {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(86px, 1fr));
		gap: 0.6rem;
		max-width: 640px;
		margin-bottom: 1.2rem;
	}
	.stat {
		display: grid;
		justify-items: center;
		gap: 0.05rem;
		padding: 0.55rem 0.4rem;
		background: var(--panel);
		border: 1px solid var(--border);
		border-top: 3px solid var(--accent-2);
	}
	.s-lbl {
		font-family: 'VT323', monospace;
		font-size: 0.9rem;
		letter-spacing: 0.12em;
		color: var(--muted);
	}
	.s-val {
		font-family: 'VT323', monospace;
		font-size: 1.9rem;
		line-height: 1;
		color: var(--accent);
		text-shadow: 2px 2px 0 #0b0c1e;
	}
	.s-mod {
		font-size: 0.85rem;
		color: var(--muted);
	}
	.grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
		gap: 1rem;
		align-content: start;
		max-width: 860px;
	}
	.panel {
		background: var(--panel);
		border: 1px solid var(--border);
		border-top: 3px solid var(--accent-2);
		padding: 1rem 1.2rem;
	}
	.panel.wide {
		grid-column: 1 / -1;
	}
	h2 {
		margin: 0 0 0.5rem;
		font-family: 'VT323', monospace;
		font-size: 1.4rem;
		letter-spacing: 0.05em;
		color: var(--accent);
		text-shadow: 2px 2px 0 #0b0c1e;
	}
	.purse {
		font-family: 'VT323', monospace;
		font-size: 1.7rem;
		color: #ffd37a;
		text-shadow: 2px 2px 0 #131022;
		margin: 0;
	}
	.chips {
		display: flex;
		flex-wrap: wrap;
		gap: 0.35rem;
	}
	.chip {
		font-size: 0.85rem;
		padding: 0.15rem 0.6rem;
		background: rgba(255, 138, 154, 0.1);
		border: 1px solid #6e3a4a;
		color: #ff8a9a;
	}
	.items {
		list-style: none;
		margin: 0;
		padding: 0;
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
		gap: 0.35rem;
	}
	.items li {
		padding: 0.3rem 0.6rem;
		background: rgba(160, 140, 199, 0.07);
		border: 1px solid var(--border);
		font-size: 0.9rem;
	}
	.fine {
		color: var(--muted);
		font-style: italic;
		margin: 0;
	}
	.whisper {
		color: var(--muted);
		font-style: italic;
		font-size: 0.82rem;
		margin-top: 1.2rem;
	}
</style>
