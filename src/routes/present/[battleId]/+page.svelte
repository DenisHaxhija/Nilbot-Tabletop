<script lang="ts">
	import { tokenColor, tokenInitials } from '$lib/token';
	import { onMount } from 'svelte';

	let { data } = $props();
	let map = $state(data.map);

	// Follow the DM's edits in real time via server-sent events. EventSource
	// reconnects automatically if the connection drops.
	onMount(() => {
		const source = new EventSource(`/api/battles/${data.battle.id}/stream`);
		source.onmessage = (e) => {
			try {
				const next = JSON.parse(e.data);
				if (next?.mapId) map = next;
			} catch {
				// malformed frame — ignore
			}
		};
		return () => source.close();
	});

	// --- Zoom & pan (set once when pointing the TV at the table) ---
	let scale = $state(1);
	let panX = $state(0);
	let panY = $state(0);
	let panning: { x: number; y: number } | null = null;

	function zoom(delta: number) {
		const next = Math.min(4, Math.max(1, scale * delta));
		scale = next;
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
</script>

<svelte:head><title>{data.battle.title} · Battle</title></svelte:head>

<div class="stage">
	<div class="backdrop" style="background-image: url('/api/maps/{map.mapId}')"></div>

	<div
		class="viewport"
		class:pannable={scale > 1}
		onwheel={onWheel}
		onpointerdown={panStart}
		onpointermove={panMove}
		onpointerup={panEnd}
		onpointercancel={panEnd}
	>
		<div class="board" style="transform: translate({panX}px, {panY}px) scale({scale})">
			<img class="map" src="/api/maps/{map.mapId}" alt="battle map" draggable="false" />
			{#each map.tokens as t (t.id)}
				<div
					class="tok"
					class:tok-dead={t.dead}
					class:tok-active={map.encounter?.activeId === t.id}
					style="
						left: {t.x * 100}%;
						top: {t.y * 100}%;
						width: {map.scale * t.cells}%;
						background: {t.img
						? `url('${t.img}') center / cover, #0d0e11`
						: t.kind === 'pc'
							? '#3d6b9e'
							: tokenColor(t.type)};
						border-color: {t.kind === 'pc'
						? t.img
							? 'rgba(122, 166, 210, 0.45)'
							: '#9ec7ef'
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

	{#if map.encounter?.round > 1 || map.encounter?.activeId}
		<div class="round-chip">Round {map.encounter.round}</div>
	{/if}

	<div class="controls">
		<button onclick={() => zoom(1 / 1.2)} title="Zoom out">−</button>
		<button onclick={resetView} title="Fit to screen">⤢</button>
		<button onclick={() => zoom(1.2)} title="Zoom in">＋</button>
	</div>
</div>

<style>
	:global(body) {
		background: #07080a;
		overflow: hidden;
	}
	.stage {
		position: fixed;
		inset: 0;
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
		max-width: 100vw;
		max-height: 100vh;
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
		background: rgba(13, 14, 17, 0.8);
		color: #d8dae0;
		border: 1px solid #343945;
		border-radius: 99px;
		padding: 0.25rem 0.9rem;
		font-family: Georgia, serif;
		font-size: clamp(0.85rem, 1.5vw, 1.2rem);
		backdrop-filter: blur(6px);
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
		opacity: 0.25;
		transition: opacity 0.2s ease;
	}
	.controls:hover {
		opacity: 1;
	}
	.controls button {
		width: 2.4rem;
		height: 2.4rem;
		border-radius: 8px;
		background: rgba(13, 14, 17, 0.8);
		border: 1px solid #343945;
		color: #d8dae0;
		font-size: 1.1rem;
		backdrop-filter: blur(6px);
	}
	.controls button:hover {
		border-color: #0fd06a;
	}
</style>
