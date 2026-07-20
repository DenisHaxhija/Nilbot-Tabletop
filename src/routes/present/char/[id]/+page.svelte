<script lang="ts">
	import '@fontsource/cinzel/700.css';
	let { data } = $props();
	const c = $derived(data.character);
</script>

<svelte:head><title>{c.name} · NilBot</title></svelte:head>

<div class="stage">
	{#if c.img}
		<div class="backdrop" style="background-image: url('{c.img}')"></div>
	{/if}
	<div class="content">
		{#if c.img}
			<img class="portrait" src={c.img} alt={c.name} />
		{/if}
		<div class="text">
			<h1>{c.name}</h1>
			{#if c.title}<p class="title">{c.title}</p>{/if}
			{#if c.description}<p class="desc">{c.description}</p>{/if}
		</div>
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
		display: flex;
		align-items: center;
		justify-content: center;
	}
	.backdrop {
		position: absolute;
		inset: -40px;
		background-size: cover;
		background-position: center;
		filter: blur(34px) brightness(0.25) saturate(0.9);
	}
	.backdrop::after {
		content: '';
		position: absolute;
		inset: 0;
		background: radial-gradient(ellipse at center, transparent 35%, rgba(0, 0, 0, 0.6) 100%);
	}
	.content {
		position: relative;
		display: flex;
		align-items: center;
		gap: clamp(1.5rem, 4vw, 4rem);
		padding: 2rem clamp(1.5rem, 5vw, 5rem);
		max-width: 1400px;
	}
	.portrait {
		max-height: 82vh;
		max-width: 44vw;
		border-radius: 12px;
		box-shadow: 0 0 70px rgba(0, 0, 0, 0.85);
		border: 1px solid rgba(255, 255, 255, 0.12);
		animation: reveal 0.8s ease both;
	}
	.text {
		color: #e6e8ec;
		animation: reveal 0.8s ease 0.25s both;
		min-width: 0;
	}
	h1 {
		font-family: 'Cinzel', Georgia, serif;
		font-size: clamp(2rem, 4.5vw, 4rem);
		margin: 0;
		color: #d4a24e;
		letter-spacing: 0.04em;
		text-shadow: 0 2px 18px rgba(0, 0, 0, 0.8);
	}
	.title {
		font-family: Georgia, serif;
		font-style: italic;
		font-size: clamp(1rem, 1.8vw, 1.5rem);
		color: #aeb4bf;
		margin: 0.3rem 0 1.2rem;
	}
	.desc {
		font-size: clamp(0.95rem, 1.4vw, 1.25rem);
		line-height: 1.7;
		white-space: pre-wrap;
		max-width: 60ch;
		margin: 0;
		text-shadow: 0 1px 8px rgba(0, 0, 0, 0.7);
	}
	@keyframes reveal {
		from {
			opacity: 0;
			transform: translateY(14px);
		}
	}
	@media (max-width: 800px) {
		.content {
			flex-direction: column;
			text-align: center;
			overflow-y: auto;
			max-height: 100vh;
		}
		.portrait {
			max-width: 80vw;
			max-height: 50vh;
		}
	}
</style>
