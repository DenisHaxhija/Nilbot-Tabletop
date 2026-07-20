<script lang="ts">
	import { invalidateAll } from '$app/navigation';
	import { confirmDialog } from '$lib/confirm.svelte';
	let { data } = $props();

	async function togglePublish(b: any) {
		await fetch(`/api/battles/${b.id}/publish`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ on: !b.published })
		});
		invalidateAll();
	}

	async function remove(id: number, title: string) {
		const ok = await confirmDialog({
			title: 'Remove battle?',
			message: `“${title}” and its map layout will be removed from this session.`,
			confirmLabel: 'Remove',
			danger: true
		});
		if (!ok) return;
		await fetch(`/api/battles/${id}`, { method: 'DELETE' });
		invalidateAll();
	}
</script>

<svelte:head><title>{data.note.title} — battles · NilBot</title></svelte:head>

<p><a href="/battles">← All battles</a></p>

<div class="head">
	<h1>{data.note.title}</h1>
	<a class="open-session" href="/notes/{data.note.id}">open session →</a>
</div>

<div class="battles">
	{#each data.battles as b (b.id)}
		<div class="battle">
			<div class="battle-head">
				<b>{b.title}</b>
				<span class="badge {b.difficulty}">{b.difficulty}</span>
				<a class="map-link" href="/battles/{data.note.id}/{b.id}">🗺 Open map</a>
				<button class="pub" class:on={b.published} onclick={() => togglePublish(b)}>
					{b.published ? '✓ published' : 'publish'}
				</button>
				<button class="del" title="Remove battle" onclick={() => remove(b.id, b.title)}>✕</button>
			</div>
			{#if b.description}<p class="desc">{b.description}</p>{/if}
			<ul>
				{#each b.creatures ?? [] as c (c.requested)}
					<li>
						{c.count}×
						{#if c.matched}
							<a href="/bestiary/{encodeURIComponent(c.slug)}">{c.name}</a>
							<small>(CR {c.cr_text ?? '?'}{c.xp ? `, ${c.xp} XP` : ''})</small>
						{:else}
							{c.requested} <small class="miss">not in bestiary</small>
						{/if}
					</li>
				{/each}
			</ul>
			{#if b.totalXp !== undefined}
				<p class="xp">
					{b.totalXp.toLocaleString()} XP ({b.adjustedXp.toLocaleString()} adjusted)
					{#if b.thresholds}· deadly at {b.thresholds.deadly.toLocaleString()}{/if}
				</p>
			{/if}
		</div>
	{:else}
		<p class="empty">No battles in this session yet.</p>
	{/each}
</div>

<style>
	.head {
		display: flex;
		align-items: baseline;
		gap: 1rem;
	}
	.open-session {
		font-size: 0.9rem;
	}
	.battles {
		display: grid;
		gap: 0.9rem;
		max-width: 700px;
	}
	.battle {
		background: var(--panel);
		border: 1px solid var(--border);
		border-left: 3px solid var(--accent-2);
		border-radius: 8px;
		padding: 0.9rem 1.1rem;
	}
	.battle-head {
		display: flex;
		align-items: center;
		gap: 0.6rem;
	}
	.battle-head b {
		flex: 1;
	}
	.badge {
		font-size: 0.72rem;
		text-transform: uppercase;
		padding: 0.1rem 0.45rem;
		border-radius: 99px;
		border: 1px solid var(--border);
		color: var(--muted);
	}
	.badge.easy { color: #7fbf7f; border-color: #7fbf7f; }
	.badge.medium { color: #d4a24e; border-color: #d4a24e; }
	.badge.hard { color: #e0955b; border-color: #e0955b; }
	.badge.deadly { color: #e06c5b; border-color: #e06c5b; }
	.map-link {
		font-size: 0.85rem;
		text-decoration: none;
		white-space: nowrap;
	}
	.pub {
		font-size: 0.78rem;
		padding: 0.15rem 0.55rem;
		color: var(--muted);
		white-space: nowrap;
	}
	.pub.on {
		color: var(--accent);
		border-color: var(--accent);
		background: rgba(127, 191, 127, 0.08);
	}
	.del {
		background: transparent;
		border: none;
		color: var(--muted);
		padding: 0 0.25rem;
	}
	.del:hover {
		color: #e06c5b;
	}
	.desc {
		color: var(--muted);
		font-size: 0.9rem;
		margin: 0.3rem 0;
	}
	ul {
		margin: 0.3rem 0;
		padding-left: 1.2rem;
	}
	.miss {
		color: #e06c5b;
	}
	.xp {
		font-size: 0.82rem;
		color: var(--muted);
		margin: 0.35rem 0 0;
	}
	.empty {
		color: var(--muted);
	}
</style>
