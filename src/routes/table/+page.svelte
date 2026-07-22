<script lang="ts">
	import { onMount } from 'svelte';
	import { fade } from 'svelte/transition';
	import { mod } from '$lib/classnotes';

	let { data } = $props();
	let cast = $state(data.cast);
	let battle = $state(data.battle);

	// The canvas and battle blocks stay live — the same streams the full
	// pages use.
	onMount(() => {
		const canvasSource = new EventSource('/api/table/canvas/stream');
		canvasSource.onmessage = (e) => {
			try {
				cast = JSON.parse(e.data);
			} catch {
				// malformed frame — ignore
			}
		};
		const battleSource = new EventSource('/api/table/battle/stream');
		battleSource.onmessage = (e) => {
			try {
				const next = JSON.parse(e.data);
				battle = next?.none ? null : next;
			} catch {
				// malformed frame — ignore
			}
		};
		return () => {
			canvasSource.close();
			battleSource.close();
		};
	});

	const STATS: { key: 'str' | 'dex' | 'con' | 'intel' | 'wis' | 'cha'; label: string }[] = [
		{ key: 'str', label: 'STR' },
		{ key: 'dex', label: 'DEX' },
		{ key: 'con', label: 'CON' },
		{ key: 'intel', label: 'INT' },
		{ key: 'wis', label: 'WIS' },
		{ key: 'cha', label: 'CHA' }
	];

	function when(at: string) {
		const d = new Date(at);
		return (
			d.toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' }) +
			' · ' +
			d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })
		);
	}
</script>

<svelte:head><title>The Table · NilBot Tabletop</title></svelte:head>

<header class="top">
	<h1>🐈‍⬛ The Table</h1>
	<p class="sub">your seat at {data.dmName}'s table</p>
</header>

<div class="grid">
	<a class="block canvas" href="/table/canvas">
		<div class="block-head">
			<h2>🎭 The Canvas</h2>
			<span class="go">behold ▸</span>
		</div>
		{#if cast.length === 0}
			<p class="fine" in:fade>the scene stands empty…</p>
		{:else}
			<div class="scene">
				{#each cast as c (c.id)}
					<figure in:fade>
						{#if c.img}
							<img src={c.img} alt={c.name} />
						{:else}
							<div class="no-img">{c.name[0]}</div>
						{/if}
						<figcaption class:mystery={c.name === '???'}>{c.name}</figcaption>
					</figure>
				{/each}
			</div>
		{/if}
	</a>

	<a class="block battle" href="/table/battle">
		<div class="block-head">
			<h2>⚔ The Battle</h2>
			<span class="go">{battle ? 'to arms ▸' : 'view ▸'}</span>
		</div>
		{#if battle}
			<div class="warfield" in:fade>
				<img class="war-map" src="/api/table/map/{battle.map.mapId}" alt={battle.title} />
				<div class="war-meta">
					<p class="war-title">{battle.title}</p>
					<p class="fine">
						{battle.map.tokens.filter((t: any) => t.kind === 'monster' && !t.dead).length} foes
						afield{#if battle.map.encounter && (battle.map.encounter.round > 1 || battle.map.encounter.activeId)}
							· round {battle.map.encounter.round}{/if}
					</p>
				</div>
			</div>
		{:else}
			<p class="fine">no battle rages — steel sleeps, for now</p>
		{/if}
	</a>

	{#if data.me}
		<a class="block" href="/table/sheet">
			<div class="block-head">
				<h2>🎲 My Sheet</h2>
				<span class="go">open ▸</span>
			</div>
			<p class="who">
				<b>{data.me.name}</b>
				<small>
					{#if data.me.class}{data.me.class} ·{/if} level {data.me.level}
				</small>
			</p>
			<div class="ministats">
				{#each STATS as s (s.key)}
					<span class="ms"
						><i>{s.label}</i>{data.me.stats[s.key]}
						<em>{mod(data.me.stats[s.key])}</em></span
					>
				{/each}
			</div>
			<p class="purse">🪙 {data.me.gold} gold</p>
			{#if data.me.conditions.length}
				<div class="chips">
					{#each data.me.conditions as c (c)}
						<span class="chip">{c}</span>
					{/each}
				</div>
			{/if}
		</a>
	{:else}
		<div class="block">
			<div class="block-head"><h2>🎲 My Sheet</h2></div>
			<p class="fine">Your DM hasn't bound a character to your key yet.</p>
		</div>
	{/if}

	<a class="block" href="/table/party">
		<div class="block-head">
			<h2>🍻 The Party</h2>
			<span class="go">gather ▸</span>
		</div>
		<p class="who">
			<b>{data.partyCount}</b>
			<small>adventurer{data.partyCount === 1 ? '' : 's'} at the table</small>
		</p>
		{#if data.nextSession}
			<p class="ev"><b>{data.nextSession.title}</b></p>
			<p class="ev-when">{when(data.nextSession.at)}</p>
		{:else}
			<p class="fine">no game night scheduled — pester your DM</p>
		{/if}
	</a>
</div>

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
	/* Two even columns: the live surfaces (canvas, battle) span the full
	   row; sheet and party sit side by side beneath them. */
	.grid {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 1rem;
		align-items: stretch;
		max-width: 1020px;
	}
	@media (max-width: 760px) {
		.grid {
			grid-template-columns: 1fr;
		}
	}
	.block {
		display: block;
		background: var(--panel);
		border: 1px solid var(--border);
		border-top: 3px solid var(--accent-2);
		padding: 1rem 1.2rem;
		min-width: 0;
		overflow: hidden;
		text-decoration: none;
		color: var(--text);
	}
	a.block:hover {
		border-color: var(--accent);
	}
	.block.canvas,
	.block.battle {
		grid-column: 1 / -1;
	}
	.warfield {
		display: flex;
		align-items: center;
		gap: 1rem;
		min-width: 0;
	}
	.war-map {
		height: 120px;
		width: 190px;
		object-fit: cover;
		border: 2px solid #38305a;
		background: #0b0c1e;
		flex: 0 0 auto;
	}
	.war-meta {
		min-width: 0;
	}
	.war-title {
		margin: 0 0 0.25rem;
		font-family: 'VT323', monospace;
		font-size: 1.4rem;
		letter-spacing: 0.04em;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
	.block-head {
		display: flex;
		align-items: baseline;
		justify-content: space-between;
		margin-bottom: 0.6rem;
	}
	h2 {
		margin: 0;
		font-family: 'VT323', monospace;
		font-size: 1.4rem;
		letter-spacing: 0.05em;
		color: var(--accent);
		text-shadow: 2px 2px 0 #0b0c1e;
	}
	.go {
		color: var(--muted);
		font-size: 0.8rem;
	}
	a.block:hover .go {
		color: var(--accent);
	}
	.scene {
		display: flex;
		align-items: flex-end;
		gap: 0.8rem;
		overflow-x: auto;
		padding-bottom: 0.2rem;
	}
	.scene figure {
		margin: 0;
		display: grid;
		justify-items: center;
		gap: 0.3rem;
		flex: 0 0 auto;
	}
	.scene img,
	.no-img {
		height: 130px;
		width: 100px;
		object-fit: cover;
		border: 2px solid #38305a;
		background: #0b0c1e;
		box-sizing: border-box;
	}
	.no-img {
		display: flex;
		align-items: center;
		justify-content: center;
		color: #4a4f5a;
		font-family: 'VT323', monospace;
		font-size: 2.2rem;
	}
	.scene figcaption {
		font-family: 'VT323', monospace;
		font-size: 1rem;
		letter-spacing: 0.04em;
		color: var(--accent);
		max-width: 100px;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
	.scene figcaption.mystery {
		color: var(--muted);
	}
	.who {
		margin: 0 0 0.5rem;
		display: flex;
		align-items: baseline;
		gap: 0.5rem;
	}
	.who b {
		font-family: 'VT323', monospace;
		font-size: 1.5rem;
		letter-spacing: 0.04em;
	}
	.who small {
		color: var(--muted);
	}
	.ministats {
		display: flex;
		flex-wrap: wrap;
		gap: 0.35rem;
		margin-bottom: 0.6rem;
	}
	.ms {
		display: inline-flex;
		align-items: baseline;
		gap: 0.3rem;
		padding: 0.15rem 0.5rem;
		background: rgba(160, 140, 199, 0.07);
		border: 1px solid var(--border);
		font-family: 'VT323', monospace;
		font-size: 1.05rem;
	}
	.ms i {
		font-style: normal;
		color: var(--muted);
		font-size: 0.85rem;
		letter-spacing: 0.08em;
	}
	.ms em {
		font-style: normal;
		color: var(--muted);
		font-size: 0.85rem;
	}
	.purse {
		font-family: 'VT323', monospace;
		font-size: 1.4rem;
		color: #ffd37a;
		text-shadow: 2px 2px 0 #131022;
		margin: 0 0 0.4rem;
	}
	.chips {
		display: flex;
		flex-wrap: wrap;
		gap: 0.35rem;
	}
	.chip {
		font-size: 0.82rem;
		padding: 0.1rem 0.55rem;
		background: rgba(255, 138, 154, 0.1);
		border: 1px solid #6e3a4a;
		color: #ff8a9a;
	}
	.ev {
		margin: 0 0 0.15rem;
	}
	.ev-when {
		color: var(--accent);
		margin: 0;
	}
	.fine {
		color: var(--muted);
		font-style: italic;
		margin: 0;
	}
</style>
