<script lang="ts">
	import { tokenColor, tokenInitials } from '$lib/token';

	let {
		name,
		type = null,
		px = 36,
		label = '',
		img = null
	}: {
		name: string;
		type?: string | null;
		px?: number;
		label?: string;
		img?: string | null;
	} = $props();

	const color = $derived(tokenColor(type));
	const text = $derived(label || tokenInitials(name));
	let broken = $state(false);
</script>

{#if img && !broken}
	<img
		class="roundel"
		src={img}
		alt={name}
		title={name}
		width={px}
		height={px}
		style="width:{px}px;height:{px}px;border-radius:50%;object-fit:cover;border:2px solid {color};background:#0d0e11;box-sizing:border-box;"
		onerror={() => (broken = true)}
	/>
{:else}
	<svg width={px} height={px} viewBox="0 0 40 40" role="img" aria-label={name}>
		<circle cx="20" cy="20" r="19" fill={color} stroke="#0d0e11" stroke-width="1.5" />
		<circle cx="20" cy="20" r="16" fill="none" stroke="rgba(255,255,255,0.35)" stroke-width="1" />
		<text
			x="20"
			y="21"
			text-anchor="middle"
			dominant-baseline="central"
			font-size={text.length > 2 ? 11 : 14}
			font-weight="700"
			fill="#fff"
			style="font-family: system-ui, sans-serif;">{text}</text
		>
	</svg>
{/if}
