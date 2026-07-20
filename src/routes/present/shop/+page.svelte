<script lang="ts">
	import '@fontsource/cinzel/700.css';
	import { onMount } from 'svelte';
	import { fade, fly } from 'svelte/transition';

	let { data } = $props();
	let stock = $state(data.stock);

	onMount(() => {
		const source = new EventSource('/api/shop/stream');
		source.onmessage = (e) => {
			try {
				stock = JSON.parse(e.data);
			} catch {
				// ignore malformed frame
			}
		};
		return () => source.close();
	});

	const rarityClass = (r: string | null) =>
		(r ?? '').toLowerCase().replace(/\s+/g, '-').replace('very-rare', 'veryrare');
</script>

<svelte:head><title>Shop · NilBot</title></svelte:head>

<div class="stage">
	<h1>Wares for Sale</h1>
	{#if stock.length === 0}
		<p class="empty" in:fade>The shopkeeper has nothing on display…</p>
	{/if}
	<div class="shelves">
		{#each stock as it (it.id)}
			<div class="ware" in:fly={{ y: 20, duration: 400 }} out:fade={{ duration: 250 }}>
				<div class="ware-head">
					<span class="wname">{it.name}</span>
					<span class="price">{it.price || 'ask'}</span>
				</div>
				<div class="ware-meta">
					{#if it.rarity}<span class="rarity {rarityClass(it.rarity)}">{it.rarity}</span>{/if}
					<span class="wtype">{it.type ?? ''}</span>
				</div>
				{#if it.attunement}<p class="attune">{it.attunement}</p>{/if}
			</div>
		{/each}
	</div>
</div>

<style>
	:global(body) {
		background: radial-gradient(ellipse at 50% 30%, #191512 0%, #080807 80%);
		overflow-y: auto;
	}
	.stage {
		min-height: 100vh;
		padding: 2.2rem clamp(1rem, 4vw, 4rem) 3rem;
		box-sizing: border-box;
	}
	h1 {
		font-family: 'Cinzel', Georgia, serif;
		color: #d4a24e;
		text-align: center;
		font-size: clamp(1.6rem, 3.4vw, 2.8rem);
		letter-spacing: 0.05em;
		margin: 0 0 1.6rem;
		text-shadow: 0 2px 16px rgba(0, 0, 0, 0.8);
	}
	.empty {
		color: #6a6459;
		text-align: center;
		font-family: Georgia, serif;
		font-style: italic;
		font-size: 1.2rem;
	}
	.shelves {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
		gap: 1rem;
		max-width: 1300px;
		margin: 0 auto;
	}
	.ware {
		background: rgba(30, 27, 22, 0.9);
		border: 1px solid #3d3627;
		border-top: 2px solid #7a6335;
		border-radius: 10px;
		padding: 0.9rem 1.1rem;
		box-shadow: 0 6px 24px rgba(0, 0, 0, 0.5);
	}
	.ware-head {
		display: flex;
		justify-content: space-between;
		align-items: baseline;
		gap: 0.8rem;
	}
	.wname {
		font-family: Georgia, serif;
		font-size: clamp(1rem, 1.4vw, 1.25rem);
		color: #e8e2d4;
		font-weight: 700;
	}
	.price {
		color: #d4a24e;
		font-weight: 700;
		white-space: nowrap;
		font-size: clamp(0.9rem, 1.2vw, 1.1rem);
	}
	.ware-meta {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		margin-top: 0.3rem;
	}
	.wtype {
		color: #8d8776;
		font-size: 0.85rem;
	}
	.rarity {
		font-size: 0.68rem;
		text-transform: uppercase;
		border: 1px solid #4a443a;
		border-radius: 99px;
		padding: 0.05rem 0.45rem;
		color: #8d8776;
		white-space: nowrap;
	}
	.rarity.common { color: #9aa0ab; }
	.rarity.uncommon { color: #7fbf7f; border-color: #7fbf7f; }
	.rarity.rare { color: #6aa3e0; border-color: #6aa3e0; }
	.rarity.veryrare { color: #b48ce0; border-color: #b48ce0; }
	.rarity.legendary { color: #e0a75b; border-color: #e0a75b; }
	.rarity.artifact { color: #e06c5b; border-color: #e06c5b; }
	.attune {
		color: #7d7666;
		font-style: italic;
		font-size: 0.8rem;
		margin: 0.4rem 0 0;
	}
</style>
