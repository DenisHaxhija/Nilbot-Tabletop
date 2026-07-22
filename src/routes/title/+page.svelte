<script lang="ts">
	import '@fontsource/cinzel/600.css';
	import '@fontsource/cinzel/700.css';
	import { page } from '$app/state';
	import { onMount } from 'svelte';

	let { data } = $props();

	// Electron opens /title?app=1 — that's when Quit makes sense.
	const inApp = $derived(page.url.searchParams.get('app') === '1');

	// Drifting embers — generated once, pure CSS animation after that.
	type Ember = { left: number; size: number; delay: number; dur: number; drift: number };
	let embers = $state<Ember[]>([]);
	onMount(() => {
		embers = Array.from({ length: 26 }, () => ({
			left: Math.random() * 100,
			size: 1.5 + Math.random() * 2.6,
			delay: -Math.random() * 18,
			dur: 9 + Math.random() * 14,
			drift: -40 + Math.random() * 80
		}));
	});

	const MENU = [
		{ href: '/', label: 'Continue', sub: '' },
		{ href: '/notes', label: 'Sessions', sub: 'write & prepare' },
		{ href: '/present', label: 'Battle Ready', sub: 'to the table' },
		{ href: '/settings', label: 'Settings', sub: '' }
	];
</script>

<svelte:head><title>NilBot Tabletop</title></svelte:head>

<div class="screen">
	<!-- Painted-backdrop stand-in: layered light until real art lands in
	     src/lib/assets/title-bg (drop-in slot, see .backdrop). -->
	<div class="backdrop"></div>
	<div class="fog"></div>
	<div class="embers" aria-hidden="true">
		{#each embers as e, i (i)}
			<span
				style="left:{e.left}%; width:{e.size}px; height:{e.size}px;
				       animation-duration:{e.dur}s; animation-delay:{e.delay}s;
				       --drift:{e.drift}px"
			></span>
		{/each}
	</div>
	<div class="vignette"></div>

	<main>
		<header>
			<p class="welcome">the tale of {data.dmName} continues</p>
			<h1>NILBOT</h1>
			<p class="sub">TABLETOP</p>
		</header>

		<nav>
			{#each MENU as m (m.href)}
				<a class="item" href={m.href}>
					<span class="blade" aria-hidden="true"></span>
					<span class="label">{m.label}</span>
					{#if m.href === '/' && data.lastSession}
						<span class="hint">{data.lastSession.title}</span>
					{:else if m.sub}
						<span class="hint">{m.sub}</span>
					{/if}
				</a>
			{/each}
			{#if inApp}
				<button class="item quit" onclick={() => window.close()}>
					<span class="blade" aria-hidden="true"></span>
					<span class="label">Quit</span>
				</button>
			{/if}
		</nav>

		<footer>
			<span>a workbench for dungeon masters</span>
			<span class="dot">·</span>
			<span>5e-compatible</span>
		</footer>
	</main>
</div>

<style>
	.screen {
		position: fixed;
		inset: 0;
		overflow: hidden;
		background: #07070a;
		color: #d8dae0;
		font-family: Georgia, 'Times New Roman', serif;
		user-select: none;
	}
	/* Backdrop slot: when real art exists, replace the gradients with
	   background-image url + cover. Until then: candlelit hall impression. */
	.backdrop {
		position: absolute;
		inset: 0;
		background:
			radial-gradient(ellipse 90% 60% at 18% 100%, rgba(196, 124, 52, 0.16) 0%, transparent 60%),
			radial-gradient(ellipse 70% 50% at 85% 95%, rgba(127, 90, 40, 0.1) 0%, transparent 55%),
			radial-gradient(ellipse 120% 80% at 50% -10%, #14161d 0%, #0a0b0f 55%, #07070a 100%);
	}
	.fog {
		position: absolute;
		inset: -20%;
		background:
			radial-gradient(ellipse 40% 18% at 30% 70%, rgba(120, 130, 160, 0.05) 0%, transparent 70%),
			radial-gradient(ellipse 50% 22% at 70% 55%, rgba(120, 130, 160, 0.04) 0%, transparent 70%);
		animation: fogdrift 40s ease-in-out infinite alternate;
	}
	@keyframes fogdrift {
		from {
			transform: translateX(-3%) translateY(1%);
		}
		to {
			transform: translateX(3%) translateY(-1%);
		}
	}
	.embers {
		position: absolute;
		inset: 0;
		pointer-events: none;
	}
	.embers span {
		position: absolute;
		bottom: -6px;
		border-radius: 50%;
		background: #e8a75c;
		box-shadow: 0 0 6px 1px rgba(232, 167, 92, 0.55);
		opacity: 0;
		animation-name: rise;
		animation-timing-function: linear;
		animation-iteration-count: infinite;
	}
	@keyframes rise {
		0% {
			transform: translateY(0) translateX(0);
			opacity: 0;
		}
		8% {
			opacity: 0.85;
		}
		60% {
			opacity: 0.5;
		}
		100% {
			transform: translateY(-105vh) translateX(var(--drift));
			opacity: 0;
		}
	}
	.vignette {
		position: absolute;
		inset: 0;
		background: radial-gradient(ellipse 75% 70% at 50% 45%, transparent 55%, rgba(0, 0, 0, 0.55) 100%);
		pointer-events: none;
	}

	main {
		position: relative;
		height: 100%;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 3rem;
		padding: 2rem;
		box-sizing: border-box;
	}
	header {
		text-align: center;
	}
	.welcome {
		color: #8a8f9c;
		font-style: italic;
		font-size: 0.95rem;
		letter-spacing: 0.08em;
		margin: 0 0 0.8rem;
		opacity: 0;
		animation: fadein 1.6s 0.3s ease forwards;
	}
	h1 {
		margin: 0;
		font-family: 'Cinzel', Georgia, serif;
		font-weight: 700;
		font-size: clamp(3rem, 9vw, 5.5rem);
		letter-spacing: 0.28em;
		text-indent: 0.28em;
		color: #e6d9b8;
		text-shadow:
			0 0 30px rgba(230, 217, 184, 0.25),
			0 2px 24px rgba(196, 124, 52, 0.35);
		opacity: 0;
		animation: fadein 1.8s 0.1s ease forwards;
	}
	.sub {
		margin: 0.2rem 0 0;
		font-family: 'Cinzel', Georgia, serif;
		font-weight: 600;
		letter-spacing: 0.85em;
		text-indent: 0.85em;
		font-size: clamp(0.8rem, 2vw, 1.05rem);
		color: #b8925c;
		opacity: 0;
		animation: fadein 1.8s 0.5s ease forwards;
	}
	@keyframes fadein {
		to {
			opacity: 1;
		}
	}

	nav {
		display: grid;
		gap: 0.35rem;
		min-width: min(340px, 80vw);
		opacity: 0;
		animation: fadein 1.4s 0.9s ease forwards;
	}
	.item {
		position: relative;
		display: flex;
		align-items: baseline;
		gap: 0.8rem;
		padding: 0.55rem 1.4rem;
		text-decoration: none;
		background: transparent;
		border: none;
		cursor: pointer;
		justify-content: center;
		text-align: center;
	}
	.label {
		font-family: 'Cinzel', Georgia, serif;
		font-weight: 600;
		font-size: 1.25rem;
		letter-spacing: 0.18em;
		color: #b9bdc9;
		transition: color 0.18s ease, text-shadow 0.18s ease;
	}
	.hint {
		color: #6a6f7c;
		font-style: italic;
		font-size: 0.8rem;
		max-width: 12rem;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
	.blade {
		position: absolute;
		left: 0;
		right: 0;
		top: 50%;
		height: 1px;
		background: linear-gradient(90deg, transparent 0%, rgba(230, 217, 184, 0.5) 50%, transparent 100%);
		opacity: 0;
		transform: scaleX(0.4);
		transition: opacity 0.2s ease, transform 0.25s ease;
		pointer-events: none;
	}
	.item:hover .label,
	.item:focus-visible .label {
		color: #e6d9b8;
		text-shadow: 0 0 18px rgba(230, 217, 184, 0.45);
	}
	.item:hover .blade,
	.item:focus-visible .blade {
		opacity: 1;
		transform: scaleX(1);
	}
	.quit .label {
		color: #8a8f9c;
	}
	.quit:hover .label {
		color: #d99a8f;
		text-shadow: 0 0 18px rgba(217, 154, 143, 0.4);
	}

	footer {
		position: absolute;
		bottom: 1.2rem;
		display: flex;
		gap: 0.6rem;
		color: #565b66;
		font-size: 0.78rem;
		letter-spacing: 0.12em;
		font-style: italic;
	}
	.dot {
		font-style: normal;
	}
</style>
