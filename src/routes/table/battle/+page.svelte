<script lang="ts">
	import { tokenColor, tokenInitials } from '$lib/token';
	import { onMount } from 'svelte';
	import { fade } from 'svelte/transition';

	let { data } = $props();
	let battle = $state(data.battle);

	// Follow the DM in real time — publishes, unpublishes and every token
	// move arrive over the seat's own stream.
	onMount(() => {
		const source = new EventSource('/api/table/battle/stream');
		source.onmessage = (e) => {
			try {
				const next = JSON.parse(e.data);
				battle = next?.none ? null : next;
			} catch {
				// malformed frame — ignore
			}
		};
		return () => source.close();
	});

	// --- Zoom & pan ---
	let scale = $state(1);
	let panX = $state(0);
	let panY = $state(0);
	let panning: { x: number; y: number } | null = null;

	function zoom(delta: number) {
		scale = Math.min(4, Math.max(1, scale * delta));
		if (scale === 1) {
			panX = 0;
			panY = 0;
		}
	}
	function resetView() {
		scale = 1;
		panX = 0;
		panY = 0;
	}
	function onWheel(e: WheelEvent) {
		e.preventDefault();
		zoom(e.deltaY < 0 ? 1.12 : 1 / 1.12);
	}
	function panStart(e: PointerEvent) {
		if (scale === 1) return;
		panning = { x: e.clientX - panX, y: e.clientY - panY };
		(e.currentTarget as Element).setPointerCapture(e.pointerId);
	}
	function panMove(e: PointerEvent) {
		if (!panning) return;
		panX = e.clientX - panning.x;
		panY = e.clientY - panning.y;
	}
	function panEnd() {
		panning = null;
	}

	// Dim the lights: the room goes dark and the battlefield floats alone.
	let dimmed = $state(false);
</script>

<svelte:window
	onkeydown={(e) => {
		if (e.key === 'Escape') dimmed = false;
	}}
/>

<svelte:head><title>The Battle · NilBot Tabletop</title></svelte:head>

<header class="top">
	<h1>⚔ The Battle</h1>
	<p class="sub">
		{#if battle}{battle.title} — as it unfolds{:else}the field, when your DM sounds the horn{/if}
	</p>
</header>

{#if !battle}
	<p class="fine" in:fade>No battle rages — steel sleeps, for now.</p>
{:else}
	{#if dimmed}
		<button
			class="lights-off"
			transition:fade={{ duration: 250 }}
			aria-label="Raise the lights"
			onclick={() => (dimmed = false)}
		></button>
	{/if}
	<div class="stage" class:cinema={dimmed}>
		<div class="backdrop" style="background-image: url('/api/table/map/{battle.map.mapId}')"></div>
		<div
			class="viewport"
			class:pannable={scale > 1}
			role="presentation"
			onwheel={onWheel}
			onpointerdown={panStart}
			onpointermove={panMove}
			onpointerup={panEnd}
			onpointercancel={panEnd}
		>
			<div class="board" style="transform: translate({panX}px, {panY}px) scale({scale})">
				<img class="map" src="/api/table/map/{battle.map.mapId}" alt="battle map" draggable="false" />
				{#each battle.map.tokens as t (t.id)}
					<div
						class="tok"
						class:tok-dead={t.dead}
						class:tok-active={battle.map.encounter?.activeId === t.id}
						style="
							left: {t.x * 100}%;
							top: {t.y * 100}%;
							width: {battle.map.scale * t.cells}%;
							background: {t.img
							? `url('${t.img}') center / cover, #0d0e11`
							: t.kind === 'pc'
								? '#3d6b9e'
								: t.kind === 'npc'
									? '#6b4d8f'
									: tokenColor(t.type)};
							border-color: {t.kind === 'pc'
							? t.img
								? 'rgba(122, 166, 210, 0.45)'
								: '#9ec7ef'
							: t.kind === 'npc'
								? t.img
									? 'rgba(169, 137, 212, 0.5)'
									: '#b99ee0'
								: t.img
									? tokenColor(t.type)
									: '#0d0e11'};
						"
					>
						{#if !t.img}
							<span
								>{t.kind === 'pc'
									? t.label || tokenInitials(t.name)
									: tokenInitials(t.name) + t.label}</span
							>
						{:else if t.label}
							<span class="corner">{t.label}</span>
						{/if}
					</div>
				{/each}
			</div>
		</div>

		{#if battle.map.encounter && (battle.map.encounter.round > 1 || battle.map.encounter.activeId)}
			<div class="round-chip">Round {battle.map.encounter.round}</div>
		{/if}

		<div class="controls">
			<button onclick={() => (dimmed = !dimmed)} title={dimmed ? 'Raise the lights' : 'Dim the lights'}
				>{dimmed ? '💡' : '🕯'}</button
			>
			<button onclick={() => zoom(1 / 1.2)} title="Zoom out">−</button>
			<button onclick={resetView} title="Fit">⤢</button>
			<button onclick={() => zoom(1.2)} title="Zoom in">＋</button>
		</div>
	</div>
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
	.fine {
		color: var(--muted);
		font-style: italic;
		margin: 0;
	}
	.stage {
		position: relative;
		height: calc(100vh - 9.5rem);
		min-height: 340px;
		overflow: hidden;
		border: 1px solid var(--border);
		background: #07080a;
	}
	/* Lights out: the room goes dark, the battlefield floats center-stage. */
	.lights-off {
		position: fixed;
		inset: 0;
		z-index: 40;
		background: rgba(3, 3, 8, 0.96);
		border: none;
		padding: 0;
		cursor: pointer;
	}
	.stage.cinema {
		position: fixed;
		inset: 2.2rem clamp(1.5rem, 6vw, 5rem);
		height: auto;
		min-height: 0;
		z-index: 50;
		border-color: #38305a;
		box-shadow: 0 0 90px rgba(0, 0, 0, 0.95);
	}
	.stage.cinema .map {
		max-height: calc(100vh - 4.4rem - 4px);
	}
	.backdrop {
		position: absolute;
		inset: -40px;
		background-size: cover;
		background-position: center;
		filter: blur(28px) brightness(0.3) saturate(0.85);
	}
	.backdrop::after {
		content: '';
		position: absolute;
		inset: 0;
		background: radial-gradient(ellipse at center, transparent 40%, rgba(0, 0, 0, 0.55) 100%);
	}
	.viewport {
		position: absolute;
		inset: 0;
		display: flex;
		align-items: center;
		justify-content: center;
		touch-action: none;
	}
	.viewport.pannable {
		cursor: grab;
	}
	.viewport.pannable:active {
		cursor: grabbing;
	}
	.board {
		position: relative;
		flex-shrink: 0;
		box-shadow: 0 0 60px rgba(0, 0, 0, 0.75);
		transition: transform 0.15s ease-out;
	}
	.map {
		display: block;
		max-width: 100%;
		max-height: calc(100vh - 9.5rem - 2px);
		width: auto;
		height: auto;
		user-select: none;
	}
	.tok {
		position: absolute;
		transform: translate(-50%, -50%);
		aspect-ratio: 1;
		border-radius: 50%;
		border: 2px solid;
		display: flex;
		align-items: center;
		justify-content: center;
		box-shadow: 0 2px 8px rgba(0, 0, 0, 0.6);
		transition: left 0.3s linear, top 0.3s linear;
	}
	.tok-dead {
		filter: grayscale(1) brightness(0.5);
	}
	.tok-active {
		outline: 3px solid #0fd06a;
		outline-offset: 2px;
		box-shadow:
			0 0 0 7px rgba(15, 208, 106, 0.22),
			0 0 24px rgba(15, 208, 106, 0.95);
		animation: turn-pulse 2.2s ease-in-out infinite;
	}
	@keyframes turn-pulse {
		0%,
		100% {
			box-shadow:
				0 0 0 7px rgba(15, 208, 106, 0.22),
				0 0 24px rgba(15, 208, 106, 0.95);
		}
		50% {
			box-shadow:
				0 0 0 5px rgba(15, 208, 106, 0.14),
				0 0 14px rgba(15, 208, 106, 0.6);
		}
	}
	.round-chip {
		position: absolute;
		top: 0.9rem;
		left: 0.9rem;
		z-index: 5;
		background: rgba(13, 14, 17, 0.85);
		color: var(--accent);
		border: 1px solid #38305a;
		padding: 0.25rem 0.9rem;
		font-family: 'VT323', monospace;
		font-size: 1.1rem;
		letter-spacing: 0.06em;
	}
	.tok span {
		color: #fff;
		font-weight: 700;
		text-shadow: 0 1px 2px rgba(0, 0, 0, 0.8);
		font-size: clamp(9px, 1.3vw, 17px);
	}
	.tok .corner {
		position: absolute;
		right: -6%;
		bottom: -6%;
		background: rgba(13, 14, 17, 0.85);
		border-radius: 50%;
		min-width: 38%;
		aspect-ratio: 1;
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: clamp(8px, 0.9vw, 13px);
	}
	.controls {
		position: absolute;
		bottom: 1rem;
		right: 1rem;
		z-index: 5;
		display: flex;
		gap: 0.35rem;
		opacity: 0.3;
		transition: opacity 0.2s ease;
	}
	.controls:hover {
		opacity: 1;
	}
	.controls button {
		width: 2.4rem;
		height: 2.4rem;
		background: rgba(13, 14, 17, 0.85);
		border: 2px solid #38305a;
		color: var(--accent);
		font-size: 1.1rem;
	}
	.controls button:hover {
		border-color: var(--accent);
	}
</style>
