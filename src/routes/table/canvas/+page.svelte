<script lang="ts">
	import { onMount } from 'svelte';
	import { fade, fly } from 'svelte/transition';

	let { data } = $props();
	let cast = $state(data.cast);

	onMount(() => {
		const source = new EventSource('/api/table/canvas/stream');
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

<svelte:head><title>The Canvas · NilBot Tabletop</title></svelte:head>

<header class="top">
	<h1>🎭 The Canvas</h1>
	<p class="sub">who stands before you — as your DM paints the scene</p>
</header>

{#if cast.length === 0}
	<p class="fine" in:fade>The canvas is empty — no one has stepped into the scene yet.</p>
{:else}
	<div class="cast" class:many={cast.length > 3}>
		{#each cast as c (c.id)}
			<figure class="card" in:fly={{ y: 26, duration: 500 }} out:fade={{ duration: 350 }}>
				<div class="frame">
					{#if c.img}
						<img src={c.img} alt={c.name} />
					{:else}
						<div class="no-img">{c.name[0]}</div>
					{/if}
				</div>
				<figcaption>
					<span class="name" class:mystery={c.name === '???'}>{c.name}</span>
					{#if c.title}<span class="title">{c.title}</span>{/if}
				</figcaption>
			</figure>
		{/each}
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
	.cast {
		display: flex;
		align-items: flex-start;
		flex-wrap: wrap;
		gap: 1.2rem;
	}
	.card {
		margin: 0;
		display: grid;
		gap: 0;
		background: var(--panel);
		border: 1px solid var(--border);
		border-top: 3px solid var(--accent-2);
		padding: 0.7rem;
		max-width: min(300px, 44vw);
	}
	.many .card {
		max-width: min(230px, 30vw);
	}
	.frame {
		border: 2px solid #38305a;
		background: #0b0c1e;
		line-height: 0;
	}
	.frame img {
		width: 100%;
		max-height: 48vh;
		object-fit: cover;
	}
	.no-img {
		width: 100%;
		aspect-ratio: 3 / 4;
		display: flex;
		align-items: center;
		justify-content: center;
		color: #4a4f5a;
		font-family: 'VT323', monospace;
		font-size: 4rem;
	}
	figcaption {
		display: grid;
		gap: 0.05rem;
		padding: 0.55rem 0.2rem 0.1rem;
	}
	.name {
		font-family: 'VT323', monospace;
		font-size: 1.5rem;
		letter-spacing: 0.05em;
		color: var(--accent);
		text-shadow: 2px 2px 0 #0b0c1e;
	}
	.name.mystery {
		color: var(--muted);
	}
	.title {
		color: var(--muted);
		font-style: italic;
		font-size: 0.85rem;
	}
</style>
