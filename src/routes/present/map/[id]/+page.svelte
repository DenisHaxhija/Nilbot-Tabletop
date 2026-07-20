<script lang="ts">
	let { data } = $props();

	let scale = $state(1);
	let panX = $state(0);
	let panY = $state(0);
	let panning: { x: number; y: number } | null = null;

	function zoom(delta: number) {
		scale = Math.min(6, Math.max(1, scale * delta));
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

<svelte:head><title>{data.map.name} · NilBot</title></svelte:head>

<div class="stage">
	<div class="backdrop" style="background-image: url('/api/maps/{data.map.id}')"></div>
	<div
		class="viewport"
		class:pannable={scale > 1}
		onwheel={onWheel}
		onpointerdown={panStart}
		onpointermove={panMove}
		onpointerup={panEnd}
		onpointercancel={panEnd}
	>
		<img
			class="map"
			style="transform: translate({panX}px, {panY}px) scale({scale})"
			src="/api/maps/{data.map.id}"
			alt={data.map.name}
			draggable="false"
		/>
	</div>
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
		filter: blur(30px) brightness(0.28) saturate(0.85);
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
	.map {
		max-width: 100vw;
		max-height: 100vh;
		box-shadow: 0 0 60px rgba(0, 0, 0, 0.75);
		transition: transform 0.15s ease-out;
		user-select: none;
	}
	.controls {
		position: absolute;
		bottom: 1rem;
		right: 1rem;
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
