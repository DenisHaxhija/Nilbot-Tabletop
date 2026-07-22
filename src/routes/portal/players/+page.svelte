<script lang="ts">
	import Token from '$lib/components/Token.svelte';

	let { data } = $props();
</script>

<svelte:head><title>Players · The Portal</title></svelte:head>

<h1>🧙 Players</h1>
<p class="tip">Click an adventurer to open their full sheet — stats, coin, items, spells, story.</p>

{#if data.players.length === 0}
	<p class="empty">
		No players in the party yet — cut a key on the <a href="/portal">Overview</a> and the invite
		forges their character.
	</p>
{/if}

<div class="grid">
	{#each data.players as p (p.id)}
		<a class="card" href="/portal/players/{p.id}">
			{#if p.img}
				<img src={p.img} alt={p.name} />
			{:else}
				<Token name={p.name} type={null} px={64} />
			{/if}
			<div class="who">
				<b>{p.name}</b>
				<small>{p.class ? `${p.class} · ` : ''}level {p.level}</small>
				{#if p.conditions.length}
					<small class="afflicted">{p.conditions.join(', ')}</small>
				{/if}
			</div>
			<div class="side">
				<span class="purse" title="Gold pieces">🪙 {p.gold}</span>
				<span class="go">edit ▸</span>
			</div>
		</a>
	{/each}
</div>

<style>
	.tip {
		color: var(--muted);
	}
	.empty {
		color: var(--muted);
	}
	.grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(min(340px, 100%), 1fr));
		gap: 1rem;
		max-width: 1120px;
	}
	.card {
		display: flex;
		align-items: center;
		gap: 0.9rem;
		background: var(--panel);
		border: 1px solid var(--border);
		border-top: 3px solid var(--accent-2);
		padding: 0.9rem 1.1rem;
		text-decoration: none;
		color: var(--text);
		min-width: 0;
	}
	.card:hover {
		border-color: var(--accent);
	}
	.card img {
		width: 64px;
		height: 64px;
		object-fit: cover;
	}
	.who {
		display: grid;
		gap: 0.1rem;
		min-width: 0;
	}
	.who b {
		font-family: var(--pixel);
		font-size: 1.3rem;
		letter-spacing: 0.04em;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
	.who small {
		color: var(--muted);
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
	.afflicted {
		color: #ff8a9a !important;
	}
	.side {
		margin-left: auto;
		display: grid;
		justify-items: end;
		gap: 0.2rem;
	}
	.purse {
		font-family: var(--pixel);
		font-size: 1.25rem;
		color: #ffd37a;
		text-shadow: 2px 2px 0 #131022;
		white-space: nowrap;
	}
	.go {
		color: var(--muted);
		font-size: 0.8rem;
	}
	.card:hover .go {
		color: var(--accent);
	}
</style>
