<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/state';

	// Living pixel backdrop behind the whole DM side. Per-room moods: the
	// sanctum's cyan motes rise, the Emporium's gold flecks settle like
	// coins, the Grimoire charges violet and rises fast.
	const MOODS: Record<
		string,
		{ top: string; mid: string; low: string; a: number[]; b: number[]; dir: number; speed: number }
	> = {
		'': { top: '#101228', mid: '#12142a', low: '#1a1636', a: [126, 224, 232], b: [180, 138, 255], dir: -1, speed: 1 },
		shop: { top: '#141126', mid: '#171228', low: '#2a1e30', a: [255, 211, 122], b: [232, 167, 92], dir: 1, speed: 0.6 },
		spells: { top: '#120f2c', mid: '#151232', low: '#241646', a: [180, 138, 255], b: [226, 160, 255], dir: -1, speed: 1.6 }
	};

	const route = $derived(
		page.url.pathname.startsWith('/shop')
			? 'shop'
			: page.url.pathname.startsWith('/spells')
				? 'spells'
				: ''
	);
	let mood = MOODS[''];
	$effect(() => {
		mood = MOODS[route] ?? MOODS[''];
	});

	let cv: HTMLCanvasElement;
	onMount(() => {
		const W = 256;
		const H = 144;
		cv.width = W;
		cv.height = H;
		const ctx = cv.getContext('2d')!;

		const stars = Array.from({ length: 40 }, () => ({
			x: Math.floor(Math.random() * W),
			y: Math.floor(Math.random() * H),
			blink: Math.random() < 0.4,
			phase: Math.floor(Math.random() * 9)
		}));
		const motes = Array.from({ length: 34 }, () => ({
			x: Math.random() * W,
			y: Math.random() * H,
			v: 0.12 + Math.random() * 0.3,
			violet: Math.random() < 0.4,
			phase: Math.floor(Math.random() * 12)
		}));

		let tick = 0;
		const draw = () => {
			tick++;
			const g = ctx.createLinearGradient(0, 0, 0, H);
			g.addColorStop(0, mood.top);
			g.addColorStop(0.6, mood.mid);
			g.addColorStop(1, mood.low);
			ctx.fillStyle = g;
			ctx.fillRect(0, 0, W, H);

			for (const s of stars) {
				if (s.blink && (tick + s.phase) % 9 < 3) continue;
				ctx.fillStyle = 'rgba(150, 160, 210, 0.35)';
				ctx.fillRect(s.x, s.y, 1, 1);
			}
			for (const m of motes) {
				m.y += mood.dir * m.v * mood.speed;
				if (m.y < -2) {
					m.y = H + 2;
					m.x = Math.random() * W;
				}
				if (m.y > H + 2) {
					m.y = -2;
					m.x = Math.random() * W;
				}
				const glow = (tick + m.phase) % 12 < 6;
				const c = m.violet ? mood.b : mood.a;
				ctx.fillStyle = `rgba(${c[0]}, ${c[1]}, ${c[2]}, ${glow ? 0.5 : 0.25})`;
				ctx.fillRect(Math.floor(m.x), Math.floor(m.y), 1, 1);
				if (glow) {
					ctx.fillStyle = `rgba(${c[0]}, ${c[1]}, ${c[2]}, 0.12)`;
					ctx.fillRect(Math.floor(m.x) - 1, Math.floor(m.y), 3, 1);
					ctx.fillRect(Math.floor(m.x), Math.floor(m.y) - 1, 1, 3);
				}
			}
		};
		draw();
		const id = setInterval(draw, 140);
		return () => clearInterval(id);
	});
</script>

<canvas bind:this={cv} aria-hidden="true"></canvas>

<style>
	canvas {
		position: fixed;
		inset: 0;
		width: 100vw;
		height: 100vh;
		z-index: -1;
		pointer-events: none;
		image-rendering: pixelated;
	}
</style>
