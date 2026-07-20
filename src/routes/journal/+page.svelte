<script lang="ts">
	import { goto, invalidateAll } from '$app/navigation';
	import { confirmDialog } from '$lib/confirm.svelte';
	let { data } = $props();

	let newSection = $state('');
	let creating = $state(false);
	let filter = $state('');

	const filtered = $derived(
		filter.trim()
			? data.sections
					.map((s: any) => ({
						...s,
						pages: s.pages.filter((p: any) =>
							(p.title || 'Untitled page').toLowerCase().includes(filter.trim().toLowerCase())
						)
					}))
					.filter((s: any) => s.pages.length > 0)
			: data.sections
	);

	// A new section starts life with one blank page — like OneNote.
	async function createSection(e: SubmitEvent) {
		e.preventDefault();
		if (!newSection.trim() || creating) return;
		creating = true;
		try {
			const res = await fetch('/api/journal', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ section: newSection.trim() })
			});
			const body = await res.json();
			if (res.ok) goto(`/journal/${body.id}`);
		} finally {
			creating = false;
		}
	}

	async function addPage(section: string) {
		const res = await fetch('/api/journal', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ section })
		});
		const body = await res.json();
		if (res.ok) goto(`/journal/${body.id}`);
	}

	async function removePage(p: any) {
		const ok = await confirmDialog({
			title: 'Delete page?',
			message: `“${p.title || 'Untitled page'}” will be deleted.`,
			confirmLabel: 'Delete',
			danger: true
		});
		if (!ok) return;
		await fetch(`/api/journal/${p.id}`, { method: 'DELETE' });
		invalidateAll();
	}
</script>

<svelte:head><title>Journal · NilBot</title></svelte:head>

<h1>Journal</h1>
<p class="tip">
	Your campaign reference — spells, pantheons, lore, houserules. Sections hold pages; pages are
	markdown, saved as you type.
</p>

<div class="toolbar">
	<form class="new-section" onsubmit={createSection}>
		<input bind:value={newSection} placeholder="New section — e.g. Pantheon of Nil" required />
		<button type="submit" disabled={creating}>＋ Create section</button>
	</form>
	{#if data.sections.length}
		<input class="filter" type="search" bind:value={filter} placeholder="Filter pages…" />
	{/if}
</div>

{#if data.sections.length === 0}
	<p class="empty">
		Nothing here yet — create your first section above. Each section starts with a blank page.
	</p>
{:else if filtered.length === 0}
	<p class="empty">No pages match “{filter}”.</p>
{/if}

<div class="grid">
	{#each filtered as s (s.name)}
		<section class="section">
			<div class="sec-head">
				<h2>{s.name || 'Loose pages'}</h2>
				<button class="add" title="New page in this section" onclick={() => addPage(s.name)}>
					＋ page
				</button>
			</div>
			<ul>
				{#each s.pages as p (p.id)}
					<li>
						<a href="/journal/{p.id}">
							<span class="ptitle">{p.title || 'Untitled page'}</span>
							<small>{p.updated_at?.slice(0, 10)}</small>
						</a>
						<button class="del" title="Delete page" onclick={() => removePage(p)}>✕</button>
					</li>
				{/each}
			</ul>
		</section>
	{/each}
</div>

<style>
	.tip {
		color: var(--muted);
	}
	.toolbar {
		display: flex;
		gap: 0.75rem;
		flex-wrap: wrap;
		align-items: center;
		margin-bottom: 1.2rem;
	}
	.new-section {
		display: flex;
		gap: 0.5rem;
		flex: 1;
		min-width: 280px;
		max-width: 520px;
	}
	.new-section input {
		flex: 1;
	}
	.filter {
		min-width: 200px;
	}
	.empty {
		color: var(--muted);
	}
	.grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
		gap: 1rem;
		align-items: start;
	}
	.section {
		background: var(--panel);
		border: 1px solid var(--border);
		border-radius: 10px;
		padding: 0.9rem 1.1rem;
	}
	.sec-head {
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: 0.5rem;
		margin-bottom: 0.4rem;
	}
	.sec-head h2 {
		margin: 0;
		font-size: 1.05rem;
		font-family: var(--serif);
		color: var(--accent);
	}
	.add {
		font-size: 0.78rem;
		padding: 0.15rem 0.5rem;
	}
	ul {
		list-style: none;
		margin: 0;
		padding: 0;
	}
	li {
		display: flex;
		align-items: center;
	}
	li a {
		flex: 1;
		display: flex;
		justify-content: space-between;
		align-items: baseline;
		gap: 0.5rem;
		text-decoration: none;
		color: var(--text);
		padding: 0.3rem 0.3rem;
		border-radius: 6px;
		min-width: 0;
	}
	li a:hover {
		background: var(--panel-2);
	}
	.ptitle {
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
	li a small {
		color: var(--muted);
		flex-shrink: 0;
	}
	.del {
		background: transparent;
		border: none;
		color: var(--muted);
		padding: 0 0.25rem;
		opacity: 0;
	}
	li:hover .del {
		opacity: 1;
	}
	.del:hover {
		color: var(--danger);
	}
</style>
