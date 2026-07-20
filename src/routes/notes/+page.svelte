<script lang="ts">
	import { confirmDialog } from '$lib/confirm.svelte';
	let { data } = $props();

	async function confirmDelete(e: SubmitEvent, title: string) {
		e.preventDefault();
		const form = e.currentTarget as HTMLFormElement;
		const ok = await confirmDialog({
			title: 'Delete session?',
			message: `“${title}” and its saved battles will be permanently deleted.`,
			confirmLabel: 'Delete',
			danger: true
		});
		if (ok) form.submit();
	}
</script>

<svelte:head><title>Sessions · NilBot</title></svelte:head>

<div class="head">
	<h1>Sessions</h1>
	<form method="POST" action="?/create">
		<button type="submit" class="new-btn">＋ Create session</button>
	</form>
</div>

{#if data.notes.length === 0}
	<p class="empty">No sessions yet. Start your first session prep!</p>
{/if}

<div class="list">
	{#each data.notes as n (n.id)}
		<div class="note">
			<a href="/notes/{n.id}">
				<h3>{n.title}</h3>
				<p>{n.preview || 'Empty note'}</p>
				<small>{n.updated_at}</small>
			</a>
			<form method="POST" action="?/delete" onsubmit={(e) => confirmDelete(e, n.title)}>
				<input type="hidden" name="id" value={n.id} />
				<button class="del" title="Delete">✕</button>
			</form>
		</div>
	{/each}
</div>

<style>
	.head {
		display: flex;
		justify-content: space-between;
		align-items: center;
	}
	.new-btn {
		font-size: 0.85rem;
		padding: 0.3rem 0.7rem;
	}
	.empty {
		color: var(--muted);
	}
	.list {
		display: grid;
		gap: 0.75rem;
	}
	.note {
		position: relative;
		background: var(--panel);
		border: 1px solid var(--border);
		border-radius: 8px;
	}
	.note:hover {
		border-color: var(--accent);
	}
	.note > a {
		display: block;
		padding: 0.9rem 1.1rem;
		text-decoration: none;
		color: var(--text);
	}
	.note h3 {
		margin: 0 0 0.2rem;
		color: var(--accent);
	}
	.note p {
		margin: 0;
		color: var(--muted);
		font-size: 0.92rem;
	}
	.note small {
		color: var(--muted);
	}
	.note form {
		position: absolute;
		top: 0.6rem;
		right: 0.6rem;
	}
	.del {
		background: transparent;
		border: none;
		color: var(--muted);
		font-size: 1rem;
	}
	.del:hover {
		color: #e06c5b;
	}
</style>
