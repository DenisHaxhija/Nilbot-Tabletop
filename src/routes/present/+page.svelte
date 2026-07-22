<script lang="ts">
	import { invalidateAll } from '$app/navigation';
	import { confirmDialog } from '$lib/confirm.svelte';
	let { data } = $props();

	async function remove(b: any) {
		const ok = await confirmDialog({
			title: 'Delete battle?',
			message: `“${b.title}” and its map setup will be permanently deleted.`,
			confirmLabel: 'Delete',
			danger: true
		});
		if (!ok) return;
		await fetch(`/api/battles/${b.id}`, { method: 'DELETE' });
		invalidateAll();
	}
</script>

<svelte:head><title>Battle Ready · NilBot</title></svelte:head>

<h1>📺 The Table</h1>
<p class="tip">
	Pick a battle to show on the TV — the view is player-safe (map and tokens only, no stat
	blocks) and follows your token moves live.
</p>

{#if data.battles.length === 0}
	<p class="empty">
		Nothing published yet — open a session's battles and hit <b>publish</b> on the ones you want
		here.
	</p>
{/if}

<div class="list">
	{#each data.battles as b (b.id)}
		<div class="row">
			<div class="info">
				<b>{b.title}</b>
				<small>{b.sessionTitle}{b.environment ? ` · ${b.environment}` : ''}</small>
			</div>
			{#if b.difficulty}<span class="badge {b.difficulty}">{b.difficulty}</span>{/if}
			{#if b.hasMap}
				<a class="present" href="/present/{b.id}" target="_blank">▶ Present</a>
			{:else}
				<span class="nomap">no map yet</span>
			{/if}
			<button class="del" title="Delete battle" onclick={() => remove(b)}>✕</button>
		</div>
	{/each}
</div>

<style>
	.tip {
		color: var(--muted);
	}
	.empty {
		color: var(--muted);
	}
	.list {
		display: grid;
		gap: 0.6rem;
		max-width: 720px;
	}
	.row {
		display: flex;
		align-items: center;
		gap: 0.9rem;
		background: var(--panel);
		border: 1px solid var(--border);
		border-radius: 8px;
		padding: 0.7rem 1rem;
	}
	.info {
		flex: 1;
		display: grid;
	}
	.info small {
		color: var(--muted);
	}
	.badge {
		font-size: 0.7rem;
		text-transform: uppercase;
		padding: 0.08rem 0.45rem;
		border-radius: 99px;
		border: 1px solid var(--border);
		color: var(--muted);
	}
	.badge.easy { color: #7fbf7f; border-color: #7fbf7f; }
	.badge.medium { color: #d4a24e; border-color: #d4a24e; }
	.badge.hard { color: #e0955b; border-color: #e0955b; }
	.badge.deadly { color: #e06c5b; border-color: #e06c5b; }
	.present {
		text-decoration: none;
		background: var(--accent-2);
		border: 1px solid var(--accent-2);
		color: var(--text);
		border-radius: 6px;
		padding: 0.35rem 0.8rem;
		font-weight: 600;
		white-space: nowrap;
	}
	.present:hover {
		filter: brightness(1.15);
	}
	.nomap {
		color: var(--muted);
		font-size: 0.85rem;
	}
	.del {
		background: transparent;
		border: none;
		color: var(--muted);
		padding: 0 0.25rem;
	}
	.del:hover {
		color: var(--danger);
	}
</style>
