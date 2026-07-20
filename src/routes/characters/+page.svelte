<script lang="ts">
	import { invalidateAll, goto } from '$app/navigation';
	import { confirmDialog } from '$lib/confirm.svelte';
	let { data } = $props();

	let newName = $state('');
	let creating = $state(false);

	async function createGroup(e: SubmitEvent) {
		e.preventDefault();
		if (!newName.trim()) return;
		creating = true;
		try {
			const res = await fetch('/api/char-groups', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ name: newName })
			});
			const body = await res.json();
			if (res.ok) {
				newName = '';
				goto(`/characters/${encodeURIComponent(body.name)}`);
			}
		} finally {
			creating = false;
		}
	}

	async function removeGroup(name: string, count: number) {
		const ok = await confirmDialog({
			title: 'Delete group?',
			message:
				count > 0
					? `“${name}” will be deleted; its ${count} character(s) move to Ungrouped.`
					: `“${name}” will be deleted.`,
			confirmLabel: 'Delete',
			danger: true
		});
		if (!ok) return;
		await fetch('/api/char-groups', {
			method: 'DELETE',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ name })
		});
		invalidateAll();
	}
</script>

<svelte:head><title>Characters · NilBot</title></svelte:head>

<div class="head">
	<h1>Characters</h1>
	<a class="canvas-link" href="/present/canvas" target="_blank">🖼 Open canvas</a>
</div>
<p class="tip">
	Your campaign's cast, organized in groups — a place, a faction, an arc. Open a group to manage
	the characters inside it.
</p>

<form class="new-group" onsubmit={createGroup}>
	<input bind:value={newName} placeholder="New group — e.g. The Gilded Serpent Tavern" required />
	<button type="submit" disabled={creating}>＋ Create group</button>
</form>

<div class="grid">
	{#each data.groups as g (g.name)}
		<div class="group-card">
			<a class="group-link" href="/characters/{encodeURIComponent(g.name)}">
				<div class="faces">
					{#each g.preview as p, i (i)}
						{#if p}
							<img src={p} alt="" loading="lazy" />
						{:else}
							<span class="face-empty">?</span>
						{/if}
					{:else}
						<span class="face-empty">∅</span>
					{/each}
				</div>
				<b>{g.name}</b>
				<small>{g.count} character{g.count === 1 ? '' : 's'}</small>
			</a>
			<button class="del" title="Delete group" onclick={() => removeGroup(g.name, g.count)}>✕</button>
		</div>
	{/each}

	{#if data.ungrouped > 0}
		<div class="group-card">
			<a class="group-link" href="/characters/_ungrouped">
				<div class="faces"><span class="face-empty">…</span></div>
				<b>Ungrouped</b>
				<small>{data.ungrouped} character{data.ungrouped === 1 ? '' : 's'}</small>
			</a>
		</div>
	{/if}

	{#if data.groups.length === 0 && data.ungrouped === 0}
		<p class="empty">No groups yet — create the first one above.</p>
	{/if}
</div>

<style>
	.head {
		display: flex;
		justify-content: space-between;
		align-items: center;
	}
	.canvas-link {
		text-decoration: none;
		font-size: 0.85rem;
		border: 1px solid var(--border);
		border-radius: 6px;
		padding: 0.3rem 0.7rem;
		color: var(--text);
	}
	.canvas-link:hover {
		border-color: var(--accent);
	}
	.tip {
		color: var(--muted);
	}
	.new-group {
		display: flex;
		gap: 0.5rem;
		margin-bottom: 1.2rem;
		max-width: 520px;
	}
	.new-group input {
		flex: 1;
	}
	.grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(230px, 1fr));
		gap: 1rem;
	}
	.group-card {
		position: relative;
		background: var(--panel);
		border: 1px solid var(--border);
		border-radius: 10px;
		transition: border-color 0.15s ease, transform 0.15s ease;
	}
	.group-card:hover {
		border-color: var(--accent);
		transform: translateY(-2px);
	}
	.group-link {
		display: grid;
		gap: 0.15rem;
		padding: 1rem 1.1rem;
		text-decoration: none;
		color: var(--text);
	}
	.faces {
		display: flex;
		margin-bottom: 0.5rem;
		min-height: 44px;
	}
	.faces img,
	.face-empty {
		width: 44px;
		height: 44px;
		border-radius: 50%;
		object-fit: cover;
		border: 2px solid var(--panel);
		margin-right: -10px;
		background: var(--panel-2);
	}
	.face-empty {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		color: var(--muted);
		font-family: var(--serif);
	}
	.group-link b {
		font-family: var(--serif);
		color: var(--accent);
		font-size: 1.05rem;
	}
	.group-link small {
		color: var(--muted);
	}
	.del {
		position: absolute;
		top: 0.5rem;
		right: 0.5rem;
		background: transparent;
		border: none;
		color: var(--muted);
		opacity: 0;
	}
	.group-card:hover .del {
		opacity: 1;
	}
	.del:hover {
		color: var(--danger);
	}
	.empty {
		color: var(--muted);
	}
</style>
