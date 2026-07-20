<script lang="ts">
	import '@fontsource/cinzel/700.css';
	import { onMount } from 'svelte';
	import { fade, fly } from 'svelte/transition';

	let { data } = $props();
	let cast = $state(data.cast);

	onMount(() => {
		const source = new EventSource('/api/canvas/stream');
		source.onmessage = (e) => {
			try {
				cast = JSON.parse(e.data);
			} catch {
				// malformed frame — ignore
			}
		};
		return () => source.close();
	});
</script>

<svelte:head><title>Canvas · NilBot</title></svelte:head>

<div class="stage">
	{#if cast.length === 0}
		<p class="empty" in:fade>The stage is empty…</p>
	{:else}
		<div class="cast" class:many={cast.length > 3}>
		{#each cast as c (c.id)}
			<figure in:fly={{ y: 26, duration: 500 }} out:fade={{ duration: 350 }}>
				{#if c.img}
					<img src={c.img} alt={c.name} />
				{:else}
					<div class="no-img">{c.name[0]}</div>
				{/if}
				<figcaption>
					<span class="name">{c.name}</span>
					{#if c.title}<span class="title">{c.title}</span>{/if}
				</figcaption>
			</figure>
		{/each}
		</div>
	{/if}
</div>

<style>
	:global(body) {
		background: radial-gradient(ellipse at 50% 40%, #14161b 0%, #07080a 75%);
		overflow: hidden;
	}
	.stage {
		position: fixed;
		inset: 0;
		display: flex;
		overflow-y: auto;
		padding: 2rem;
		box-sizing: border-box;
	}
	.empty {
		color: #4a4f5a;
		font-family: Georgia, serif;
		font-style: italic;
		font-size: clamp(1.1rem, 2vw, 1.6rem);
		margin: auto;
	}
	.cast {
		display: flex;
		align-items: flex-end;
		justify-content: center;
		gap: clamp(1rem, 3vw, 3rem);
		flex-wrap: wrap;
		max-width: 100%;
		/* margin auto centers when the cast fits, and allows scrolling when it doesn't */
		margin: auto;
		padding-bottom: 1rem;
	}
	figure {
		margin: 0;
		display: grid;
		justify-items: center;
		gap: 0.7rem;
		min-width: 0;
	}
	figure img,
	.no-img {
		max-height: 68vh;
		max-width: 26vw;
		border-radius: 10px;
		box-shadow: 0 12px 50px rgba(0, 0, 0, 0.8);
		border: 1px solid rgba(255, 255, 255, 0.1);
		object-fit: cover;
	}
	.many figure img,
	.many .no-img {
		max-height: 52vh;
		max-width: 18vw;
	}
	.no-img {
		width: 20vw;
		aspect-ratio: 3 / 4;
		display: flex;
		align-items: center;
		justify-content: center;
		background: #1e2128;
		color: #4a4f5a;
		font-family: 'Cinzel', Georgia, serif;
		font-size: 4rem;
	}
	figcaption {
		display: grid;
		justify-items: center;
		gap: 0.1rem;
	}
	.name {
		font-family: 'Cinzel', Georgia, serif;
		color: #d4a24e;
		font-size: clamp(1rem, 1.9vw, 1.7rem);
		letter-spacing: 0.04em;
		text-shadow: 0 2px 12px rgba(0, 0, 0, 0.8);
		text-align: center;
	}
	.title {
		color: #8a8f9c;
		font-family: Georgia, serif;
		font-style: italic;
		font-size: clamp(0.75rem, 1.1vw, 1rem);
		text-align: center;
	}
	@media (max-width: 800px) {
		figure img,
		.no-img,
		.many figure img,
		.many .no-img {
			max-width: 42vw;
			max-height: 40vh;
		}
	}
</style>
