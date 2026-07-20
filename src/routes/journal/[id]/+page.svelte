<script lang="ts">
	import { marked } from 'marked';
	import { goto, invalidateAll } from '$app/navigation';
	import { confirmDialog } from '$lib/confirm.svelte';

	let { data } = $props();

	let title = $state(data.page.title);
	let section = $state(data.page.section);
	let content = $state(data.page.content);
	let pageId = $state(data.page.id);
	let saveState = $state<'saved' | 'saving' | 'error'>('saved');
	let showPreview = $state(false);

	// The component is reused when navigating between pages — resync.
	$effect(() => {
		if (data.page.id === pageId) return;
		pageId = data.page.id;
		title = data.page.title;
		section = data.page.section;
		content = data.page.content;
		saveState = 'saved';
	});

	let saveTimer: ReturnType<typeof setTimeout>;
	function scheduleSave() {
		saveState = 'saving';
		clearTimeout(saveTimer);
		saveTimer = setTimeout(save, 1200);
	}
	async function save() {
		try {
			const res = await fetch(`/api/journal/${data.page.id}`, {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ title, content, section })
			});
			saveState = res.ok ? 'saved' : 'error';
			invalidateAll(); // keep the page rail's titles fresh
		} catch {
			saveState = 'error';
		}
	}

	async function addPage() {
		const res = await fetch('/api/journal', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ section })
		});
		const body = await res.json();
		if (res.ok) goto(`/journal/${body.id}`);
	}

	async function removePage() {
		const ok = await confirmDialog({
			title: 'Delete page?',
			message: `“${title || 'Untitled page'}” will be deleted.`,
			confirmLabel: 'Delete',
			danger: true
		});
		if (!ok) return;
		await fetch(`/api/journal/${data.page.id}`, { method: 'DELETE' });
		goto('/journal');
	}
</script>

<svelte:head><title>{title || 'Journal page'} · NilBot</title></svelte:head>

<p><a href="/journal">← Journal</a></p>

<div class="editor-head">
	<input class="title" bind:value={title} oninput={scheduleSave} placeholder="Page title" />
	<span class="status" class:error={saveState === 'error'}>
		{saveState === 'saved' ? '✓ saved' : saveState === 'saving' ? 'saving…' : 'save failed'}
	</span>
	<button onclick={() => (showPreview = !showPreview)}>
		{showPreview ? 'Edit' : 'Preview'}
	</button>
	<button class="del" onclick={removePage} title="Delete this page">✕ Delete</button>
</div>

<div class="workspace">
	<aside class="rail">
		<label class="sec">
			Section
			<input
				bind:value={section}
				oninput={scheduleSave}
				list="journal-sections"
				placeholder="no section"
			/>
			<datalist id="journal-sections">
				{#each data.sections as s (s)}<option value={s}></option>{/each}
			</datalist>
		</label>
		<div class="rail-head">
			<span>{section || 'Loose pages'}</span>
			<button class="add" onclick={addPage} title="New page in this section">＋</button>
		</div>
		<ul>
			{#each data.siblings as p (p.id)}
				<li>
					<a href="/journal/{p.id}" class:on={p.id === data.page.id}>
						{p.id === data.page.id ? title || 'Untitled page' : p.title || 'Untitled page'}
					</a>
				</li>
			{/each}
		</ul>
	</aside>

	<div class="pane">
		{#if showPreview}
			<div class="preview">
				<!-- eslint-disable-next-line svelte/no-at-html-tags -->
				{@html marked(content)}
			</div>
		{:else}
			<textarea
				bind:value={content}
				oninput={scheduleSave}
				placeholder="Write in markdown — # headings, **bold**, tables, lists… Preview shows the rendered page."
			></textarea>
		{/if}
	</div>
</div>

<style>
	.editor-head {
		display: flex;
		align-items: center;
		gap: 0.6rem;
		margin-bottom: 0.8rem;
	}
	.title {
		flex: 1;
		font-size: 1.25rem;
		font-family: var(--serif);
		background: transparent;
		border: none;
		border-bottom: 1px solid var(--border);
		border-radius: 0;
		padding: 0.3rem 0.1rem;
		color: var(--text);
		min-width: 0;
	}
	.title:focus {
		outline: none;
		border-bottom-color: var(--accent);
	}
	.status {
		color: var(--muted);
		font-size: 0.82rem;
		white-space: nowrap;
	}
	.status.error {
		color: var(--danger);
	}
	.del {
		color: var(--muted);
	}
	.del:hover {
		color: var(--danger);
		border-color: var(--danger);
	}
	.workspace {
		display: grid;
		grid-template-columns: 220px minmax(0, 1fr);
		gap: 1rem;
		align-items: start;
	}
	@media (max-width: 800px) {
		.workspace {
			grid-template-columns: 1fr;
		}
	}
	.rail {
		background: var(--panel);
		border: 1px solid var(--border);
		border-radius: 10px;
		padding: 0.7rem 0.8rem;
		display: grid;
		gap: 0.5rem;
	}
	.sec {
		display: grid;
		gap: 0.2rem;
		font-size: 0.78rem;
		color: var(--muted);
	}
	.sec input {
		font-size: 0.85rem;
		width: 100%;
		box-sizing: border-box;
	}
	.rail-head {
		display: flex;
		justify-content: space-between;
		align-items: center;
		font-size: 0.8rem;
		color: var(--accent);
		border-top: 1px solid var(--border);
		padding-top: 0.5rem;
	}
	.add {
		font-size: 0.8rem;
		padding: 0.05rem 0.45rem;
	}
	.rail ul {
		list-style: none;
		margin: 0;
		padding: 0;
		display: grid;
		gap: 0.1rem;
		max-height: 60vh;
		overflow-y: auto;
	}
	.rail a {
		display: block;
		text-decoration: none;
		color: var(--text);
		font-size: 0.88rem;
		padding: 0.25rem 0.45rem;
		border-radius: 6px;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
	.rail a:hover {
		background: var(--panel-2);
	}
	.rail a.on {
		background: rgba(127, 191, 127, 0.1);
		color: var(--accent);
	}
	.pane textarea {
		width: 100%;
		box-sizing: border-box;
		min-height: 68vh;
		resize: vertical;
		font: inherit;
		line-height: 1.6;
		padding: 0.9rem 1rem;
	}
	.preview {
		background: var(--panel);
		border: 1px solid var(--border);
		border-radius: 10px;
		padding: 1rem 1.4rem;
		min-height: 68vh;
		line-height: 1.6;
	}
	.preview :global(h1),
	.preview :global(h2),
	.preview :global(h3) {
		font-family: var(--serif);
		color: var(--accent);
	}
	.preview :global(a) {
		color: var(--accent);
	}
	.preview :global(blockquote) {
		border-left: 3px solid var(--border);
		margin-left: 0;
		padding-left: 1rem;
		color: var(--muted);
	}
	.preview :global(table) {
		border-collapse: collapse;
	}
	.preview :global(td),
	.preview :global(th) {
		border: 1px solid var(--border);
		padding: 0.3rem 0.6rem;
	}
	.preview :global(code) {
		background: var(--panel-2);
		padding: 0.1rem 0.35rem;
		border-radius: 4px;
	}
</style>
