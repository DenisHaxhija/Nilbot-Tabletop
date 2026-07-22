<script lang="ts">
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

<svelte:head><title>The Party · NilBot Tabletop</title></svelte:head>

<header class="top">
	<h1>The Party</h1>
	<p class="sub">the fellowship at {data.dmName}'s table</p>
</header>

<div class="grid">
	<section class="panel">
		<h2>Adventurers</h2>
		<ul class="party">
			{#each data.party as p (p.id)}
				<li>
					<b>{p.name}</b>
					<small>
						{#if p.class}{p.class} ·{/if} level {p.level}
					</small>
				</li>
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
</div>

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
	.grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
		gap: 1rem;
		align-content: start;
		max-width: 860px;
	}
	.panel {
		background: var(--panel);
		border: 1px solid var(--border);
		border-top: 3px solid var(--accent-2);
		padding: 1rem 1.2rem;
	}
	h2 {
		margin: 0 0 0.5rem;
		font-family: 'VT323', monospace;
		font-size: 1.4rem;
		letter-spacing: 0.05em;
		color: var(--accent);
		text-shadow: 2px 2px 0 #0b0c1e;
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
		margin-left: 0.4rem;
	}
	.ev {
		margin: 0 0 0.2rem;
	}
	.ev-when {
		color: var(--accent);
		margin: 0 0 0.3rem;
	}
	.fine {
		color: var(--muted);
		font-style: italic;
		margin: 0;
	}
</style>
