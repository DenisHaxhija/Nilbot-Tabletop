<script lang="ts">
	let { data } = $props();
</script>

<svelte:head><title>Battles · NilBot</title></svelte:head>

<h1>Battles</h1>

{#if data.sessions.length === 0}
	<p class="empty">
		No battles saved yet. Open a session, click <b>⚔ Extract battles</b>, then click an
		encounter to save it here.
	</p>
{/if}

<div class="list">
	{#each data.sessions as s (s.id)}
		<a class="session" href="/battles/{s.id}">
			<h3>{s.title}</h3>
			<p>{s.battles} {s.battles === 1 ? 'battle' : 'battles'}</p>
		</a>
	{/each}
</div>

<style>
	.empty {
		color: var(--muted);
	}
	.list {
		display: grid;
		gap: 0.75rem;
	}
	.session {
		display: block;
		background: var(--panel);
		border: 1px solid var(--border);
		border-radius: 8px;
		padding: 0.9rem 1.1rem;
		text-decoration: none;
		color: var(--text);
	}
	.session:hover {
		border-color: var(--accent);
	}
	.session h3 {
		margin: 0 0 0.2rem;
		color: var(--accent);
	}
	.session p {
		margin: 0;
		color: var(--muted);
		font-size: 0.9rem;
	}
</style>
