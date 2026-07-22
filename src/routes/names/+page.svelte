<script lang="ts">
	import { cultures, generateName, generateTavern, generatePlace } from '$lib/names';

	let culture = $state('Human');
	let names = $state<string[]>([]);
	let taverns = $state<string[]>([]);
	let places = $state<string[]>([]);

	function rollNames() {
		names = Array.from({ length: 10 }, () => generateName(culture));
	}
	function rollTaverns() {
		taverns = Array.from({ length: 6 }, generateTavern);
	}
	function rollPlaces() {
		places = Array.from({ length: 6 }, generatePlace);
	}
</script>

<svelte:head><title>Name Generator · NilBot</title></svelte:head>

<h1>⚄ The Namesmith</h1>

<div class="grid">
	<section>
		<h2>Characters</h2>
		<div class="controls">
			<select bind:value={culture}>
				{#each cultures as c (c)}
					<option value={c}>{c}</option>
				{/each}
			</select>
			<button onclick={rollNames}>Roll 10 names</button>
		</div>
		<ul>
			{#each names as n, i (i)}
				<li>{n}</li>
			{/each}
		</ul>
	</section>

	<section>
		<h2>Taverns &amp; Inns</h2>
		<button onclick={rollTaverns}>Roll 6 taverns</button>
		<ul>
			{#each taverns as t, i (i)}
				<li>{t}</li>
			{/each}
		</ul>
	</section>

	<section>
		<h2>Settlements</h2>
		<button onclick={rollPlaces}>Roll 6 places</button>
		<ul>
			{#each places as p, i (i)}
				<li>{p}</li>
			{/each}
		</ul>
	</section>
</div>

<style>
	.grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
		gap: 1rem;
	}
	section {
		background: var(--panel);
		border: 1px solid var(--border);
		border-radius: 8px;
		padding: 1rem 1.25rem;
	}
	h2 {
		margin-top: 0;
		color: var(--accent);
		font-size: 1.1rem;
	}
	.controls {
		display: flex;
		gap: 0.5rem;
	}
	ul {
		padding-left: 1.2rem;
		line-height: 1.9;
	}
</style>
