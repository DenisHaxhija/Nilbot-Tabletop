<script lang="ts">
	import '@fontsource/vt323/index.css';
	import ManaField from '$lib/components/ManaField.svelte';
	import { page } from '$app/state';
	import { classInfo } from '$lib/classnotes';

	let { data, children } = $props();

	const info = $derived(classInfo(data.me?.class));
	const path = $derived(page.url.pathname);
	const active = (href: string) =>
		href === '/table' ? path === '/table' : path.startsWith(href);
</script>

<ManaField />
<div class="seat">
	<aside>
		<div class="brand">🐈‍⬛ THE TABLE</div>
		<div class="hero">
			<b>{data.me?.name ?? data.playerName}</b>
			{#if data.me?.class}
				<small>{data.me.class} · level {data.me.level}</small>
			{:else if data.me}
				<small>level {data.me.level}</small>
			{:else}
				<small>awaiting a character</small>
			{/if}
		</div>

		<nav>
			<a href="/table" class:active={active('/table')}>🐈‍⬛ Overview</a>
			<a href="/table/sheet" class:active={active('/table/sheet')}>🎲 My Sheet</a>
			{#if info && info.caster !== 'none'}
				<a href="/table/spells" class:active={active('/table/spells')}>✦ Spells</a>
			{/if}
			<a href="/table/canvas" class:active={active('/table/canvas')}>🎭 The Canvas</a>
			<a href="/table/battle" class:active={active('/table/battle')}>⚔ The Battle</a>
			<a href="/table/party" class:active={active('/table/party')}>🍻 The Party</a>
		</nav>

		{#if info}
			<div class="lore">
				<span class="lore-t">{info.name}</span>
				<p class="blurb">{info.blurb}</p>
				<dl>
					<dt>Hit die</dt>
					<dd>{info.hitDie}</dd>
					<dt>Primary</dt>
					<dd>{info.primary}</dd>
					<dt>Saves</dt>
					<dd>{info.saves}</dd>
				</dl>
			</div>
		{/if}

		<div class="foot">
			<span class="who">{data.playerName} · at {data.dmName}'s table</span>
			<!-- Back to the game's title screen (the shell intercepts /__title). -->
			<a class="to-menu" href="/__title" data-sveltekit-reload>◀ MENU</a>
		</div>
	</aside>

	<main>
		{@render children()}
	</main>
</div>

<style>
	.seat {
		--accent: #a08cc7;
		--accent-2: #5e4f85;
		min-height: 100vh;
		display: flex;
	}
	aside {
		width: 232px;
		flex-shrink: 0;
		display: flex;
		flex-direction: column;
		gap: 1.1rem;
		padding: 1rem 0.9rem;
		border-right: 1px solid #38305a;
		background: rgba(14, 13, 30, 0.55);
		box-sizing: border-box;
		position: sticky;
		top: 0;
		height: 100vh;
		overflow-y: auto;
	}
	.brand {
		font-family: 'VT323', monospace;
		font-size: 1.3rem;
		letter-spacing: 0.12em;
		color: var(--accent);
		text-shadow: 2px 2px 0 #0b0c1e;
	}
	.hero {
		display: grid;
		gap: 0.1rem;
		padding: 0.6rem 0.7rem;
		border: 1px solid #38305a;
		border-left: 3px solid var(--accent-2);
	}
	.hero b {
		font-family: 'VT323', monospace;
		font-size: 1.35rem;
		letter-spacing: 0.04em;
	}
	.hero small {
		color: var(--muted);
	}
	nav {
		display: grid;
		gap: 0.2rem;
	}
	nav a {
		font-family: 'VT323', monospace;
		font-size: 1.15rem;
		letter-spacing: 0.06em;
		color: var(--muted);
		text-decoration: none;
		padding: 0.35rem 0.6rem;
		border: 1px solid transparent;
	}
	nav a:hover {
		color: var(--accent);
	}
	nav a.active {
		color: var(--accent);
		border-color: #38305a;
		background: rgba(160, 140, 199, 0.08);
	}
	.lore {
		border: 1px solid #38305a;
		padding: 0.7rem 0.8rem;
		display: grid;
		gap: 0.4rem;
	}
	.lore-t {
		font-family: 'VT323', monospace;
		font-size: 1.1rem;
		letter-spacing: 0.1em;
		text-transform: uppercase;
		color: var(--accent);
	}
	.blurb {
		margin: 0;
		font-size: 0.8rem;
		color: var(--muted);
		font-style: italic;
		line-height: 1.35;
	}
	dl {
		margin: 0;
		display: grid;
		grid-template-columns: auto 1fr;
		gap: 0.15rem 0.6rem;
		font-size: 0.8rem;
	}
	dt {
		color: var(--muted);
	}
	dd {
		margin: 0;
	}
	.foot {
		margin-top: auto;
		display: grid;
		gap: 0.6rem;
	}
	.who {
		color: var(--muted);
		font-size: 0.75rem;
	}
	.to-menu {
		justify-self: start;
		background: rgba(18, 20, 42, 0.92);
		color: var(--accent);
		border: 2px solid #38305a;
		padding: 5px 12px;
		font-family: 'VT323', monospace;
		font-size: 0.95rem;
		letter-spacing: 0.08em;
		text-decoration: none;
	}
	.to-menu:hover {
		color: #ffe98a;
		border-color: var(--accent);
	}
	main {
		flex: 1;
		padding: 1.6rem 2rem;
		max-width: 1080px;
		box-sizing: border-box;
		min-width: 0;
	}
</style>
