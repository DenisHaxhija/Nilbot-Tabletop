<script lang="ts">
	import { mod } from '$lib/classnotes';
	let { data } = $props();

	let openItem = $state<number | null>(null);

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
				<div class="itemlist">
					{#each data.me.items as it, i (i)}
						<div class="item" class:open={openItem === i} class:plain={!it.desc}>
							<button
								class="item-head"
								disabled={!it.desc}
								onclick={() => (openItem = openItem === i ? null : i)}
							>
								<b>{it.name}</b>
								{#if it.type || it.rarity}
									<small>
										{[it.type, it.rarity].filter(Boolean).join(' · ')}
									</small>
								{/if}
								{#if it.desc}<span class="arrow">{openItem === i ? '▾' : '▸'}</span>{/if}
							</button>
							{#if openItem === i && it.desc}
								<div class="item-body">
									{#if it.attunement}<p class="fine">{it.attunement}</p>{/if}
									<p class="item-desc">{it.desc}</p>
								</div>
							{/if}
						</div>
					{/each}
				</div>
			{:else}
				<p class="fine">empty-handed — your DM holds the purse strings</p>
			{/if}
		</section>

		{#if data.me.spells.length}
			<section class="panel wide">
				<h2>Spells Granted</h2>
				<ul class="items">
					{#each data.me.spells as sp, i (i)}
						<li>✦ {sp}</li>
					{/each}
				</ul>
			</section>
		{/if}

		{#if data.me.backstory}
			<section class="panel wide">
				<h2>Backstory</h2>
				<p class="story">{data.me.backstory}</p>
			</section>
		{/if}
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
	.story {
		margin: 0;
		line-height: 1.55;
		white-space: pre-wrap;
	}
	.itemlist {
		display: grid;
		gap: 0.35rem;
	}
	.item {
		background: rgba(160, 140, 199, 0.07);
		border: 1px solid var(--border);
	}
	.item.open {
		border-color: var(--accent-2);
	}
	.item-head {
		width: 100%;
		display: flex;
		align-items: center;
		gap: 0.7rem;
		background: transparent;
		border: none;
		color: inherit;
		font: inherit;
		text-align: left;
		padding: 0.4rem 0.7rem;
		cursor: pointer;
	}
	.item.plain .item-head {
		cursor: default;
	}
	.item-head b {
		font-family: 'VT323', monospace;
		font-size: 1.1rem;
		letter-spacing: 0.03em;
	}
	.item-head small {
		color: var(--muted);
	}
	.arrow {
		margin-left: auto;
		color: var(--muted);
	}
	.item-body {
		padding: 0 0.7rem 0.7rem;
	}
	.item-desc {
		margin: 0.3rem 0 0;
		font-size: 0.9rem;
		line-height: 1.5;
		white-space: pre-wrap;
	}
	.whisper {
		color: var(--muted);
		font-style: italic;
		font-size: 0.82rem;
		margin-top: 1.2rem;
	}
</style>
