<script lang="ts">
	import '@fontsource/vt323/index.css';
	import ManaField from '$lib/components/ManaField.svelte';
	let { data } = $props();

	function when(at: string) {
		const d = new Date(at);
		return (
			d.toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' }) +
			' · ' +
			d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })
		);
	}
</script>

<svelte:head><title>The Table · NilBot Tabletop</title></svelte:head>

<ManaField />
<div class="seat">
	<header>
		<span class="brand">🐈‍⬛ THE TABLE</span>
		<span class="who">{data.playerName} · at {data.dmName}'s table</span>
	</header>

	<main>
		{#if data.me}
			<section class="panel me">
				<h2>{data.me.name}</h2>
				{#if data.me.class}<p class="klass">{data.me.class}</p>{/if}
				<p class="purse">🪙 {data.me.gold} gold</p>
				{#if data.me.conditions.length}
					<div class="chips">
						{#each data.me.conditions as c (c)}
							<span class="chip">{c}</span>
						{/each}
					</div>
				{:else}
					<p class="fine">unafflicted — for now</p>
				{/if}
			</section>
		{:else}
			<section class="panel me">
				<h2>{data.playerName}</h2>
				<p class="fine">Your DM hasn't bound a character to your key yet.</p>
			</section>
		{/if}

		<section class="panel">
			<h2>The Party</h2>
			<ul class="party">
				{#each data.party as p (p.id)}
					<li><b>{p.name}</b>{#if p.class}<small> · {p.class}</small>{/if}</li>
				{/each}
			</ul>
		</section>

		<section class="panel">
			<h2>Next Game Night</h2>
			{#if data.nextSession}
				<p class="ev"><b>{data.nextSession.title}</b></p>
				<p class="ev-when">{when(data.nextSession.at)}</p>
				{#if data.nextSession.note}<p class="fine">{data.nextSession.note}</p>{/if}
			{:else}
				<p class="fine">Nothing scheduled — pester your DM.</p>
			{/if}
		</section>
	</main>
	<footer>more of the table arrives as the bridge grows</footer>
</div>

<style>
	.seat {
		--accent: #a08cc7;
		--accent-2: #5e4f85;
		min-height: 100vh;
		display: flex;
		flex-direction: column;
		font-family: system-ui, sans-serif;
	}
	header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 0.8rem 1.4rem;
		border-bottom: 1px solid #38305a;
	}
	.brand {
		font-family: 'VT323', monospace;
		font-size: 1.35rem;
		letter-spacing: 0.12em;
		color: var(--accent);
		text-shadow: 2px 2px 0 #0b0c1e;
	}
	.who {
		color: var(--muted);
		font-size: 0.9rem;
	}
	main {
		flex: 1;
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
		gap: 1rem;
		align-content: start;
		padding: 1.6rem;
		max-width: 1080px;
		margin: 0 auto;
		width: 100%;
		box-sizing: border-box;
	}
	.panel {
		background: var(--panel);
		border: 1px solid var(--border);
		border-top: 3px solid var(--accent-2);
		padding: 1.1rem 1.3rem;
	}
	h2 {
		margin: 0 0 0.5rem;
		font-family: 'VT323', monospace;
		font-size: 1.5rem;
		letter-spacing: 0.05em;
		color: var(--accent);
		text-shadow: 2px 2px 0 #0b0c1e;
	}
	.klass {
		color: var(--muted);
		margin: 0 0 0.5rem;
	}
	.purse {
		font-family: 'VT323', monospace;
		font-size: 1.6rem;
		color: #ffd37a;
		text-shadow: 2px 2px 0 #131022;
		margin: 0 0 0.5rem;
	}
	.chips {
		display: flex;
		flex-wrap: wrap;
		gap: 0.35rem;
	}
	.chip {
		font-size: 0.85rem;
		padding: 0.15rem 0.6rem;
		background: rgba(255, 138, 154, 0.1);
		border: 1px solid #6e3a4a;
		color: #ff8a9a;
	}
	.fine {
		color: var(--muted);
		font-style: italic;
		margin: 0;
	}
	.party {
		list-style: none;
		margin: 0;
		padding: 0;
		display: grid;
		gap: 0.3rem;
	}
	.party small {
		color: var(--muted);
	}
	.ev {
		margin: 0 0 0.2rem;
	}
	.ev-when {
		color: var(--accent);
		margin: 0 0 0.3rem;
	}
	footer {
		text-align: center;
		color: var(--muted);
		font-style: italic;
		font-size: 0.82rem;
		padding: 1rem;
	}
</style>
