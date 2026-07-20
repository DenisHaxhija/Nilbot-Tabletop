<script lang="ts">
	import { marked } from 'marked';
	import { goto, invalidateAll } from '$app/navigation';
	import { confirmDialog } from '$lib/confirm.svelte';

	let { data } = $props();

	// --- Selected page editor state (resynced only when the page changes,
	// so autosave-triggered reloads never clobber in-flight typing) ---
	let pageId = $state(data.selected?.id ?? null);
	let title = $state(data.selected?.title ?? '');
	let content = $state(data.selected?.content ?? '');
	let pageSection = $state(data.selected?.section ?? '');
	let saveState = $state<'saved' | 'saving' | 'error'>('saved');
	let showPreview = $state(false);

	// Which section the middle pane shows — follows the selected page, but
	// can be browsed independently.
	let viewSection = $state(data.selected?.section ?? data.sections[0]?.name ?? '');

	$effect(() => {
		if ((data.selected?.id ?? null) === pageId) return;
		pageId = data.selected?.id ?? null;
		title = data.selected?.title ?? '';
		content = data.selected?.content ?? '';
		pageSection = data.selected?.section ?? '';
		viewSection = data.selected?.section ?? data.sections[0]?.name ?? '';
		saveState = 'saved';
	});

	const viewPages = $derived(
		data.sections.find((s: any) => s.name === viewSection)?.pages ?? []
	);

	let saveTimer: ReturnType<typeof setTimeout>;
	function scheduleSave() {
		if (pageId === null) return;
		saveState = 'saving';
		clearTimeout(saveTimer);
		saveTimer = setTimeout(save, 1200);
	}
	async function save() {
		if (pageId === null) return;
		try {
			const res = await fetch(`/api/journal/${pageId}`, {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ title, content, section: pageSection })
			});
			saveState = res.ok ? 'saved' : 'error';
			invalidateAll(); // keep rail titles/sections fresh
		} catch {
			saveState = 'error';
		}
	}

	function openPage(id: number) {
		if (id === pageId) return;
		goto(`/journal?p=${id}`, { noScroll: true, keepFocus: false });
	}

	// --- Creating ---
	let newSection = $state('');
	let addingSection = $state(false);
	async function createPage(section: string) {
		const res = await fetch('/api/journal', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ section })
		});
		const body = await res.json();
		if (res.ok) {
			await goto(`/journal?p=${body.id}`, { noScroll: true });
			await invalidateAll();
		}
	}
	async function createSection(e: SubmitEvent) {
		e.preventDefault();
		const name = newSection.trim();
		if (!name) return;
		newSection = '';
		addingSection = false;
		await createPage(name);
	}

	async function removePage(p: { id: number; title: string }) {
		const ok = await confirmDialog({
			title: 'Delete page?',
			message: `“${p.title || 'Untitled page'}” will be deleted.`,
			confirmLabel: 'Delete',
			danger: true
		});
		if (!ok) return;
		await fetch(`/api/journal/${p.id}`, { method: 'DELETE' });
		if (p.id === pageId) await goto('/journal', { noScroll: true });
		await invalidateAll();
	}

	// Moving the open page to another section (datalist of existing ones).
	function onSectionEdit() {
		viewSection = pageSection;
		scheduleSave();
	}
</script>

<svelte:head><title>Journal · NilBot</title></svelte:head>

<div class="workspace">
	<aside class="pane sections">
		<div class="pane-head">Sections</div>
		<ul>
			{#each data.sections as s (s.name)}
				<li>
					<button
						class="row"
						class:on={s.name === viewSection}
						onclick={() => (viewSection = s.name)}
					>
						<span class="row-label">{s.name || 'Loose pages'}</span>
						<small>{s.pages.length}</small>
					</button>
				</li>
			{/each}
		</ul>
		{#if addingSection}
			<form onsubmit={createSection}>
				<!-- svelte-ignore a11y_autofocus -->
				<input
					bind:value={newSection}
					placeholder="Section name"
					autofocus
					onblur={() => !newSection.trim() && (addingSection = false)}
				/>
			</form>
		{:else}
			<button class="ghost" onclick={() => (addingSection = true)}>＋ New section</button>
		{/if}
	</aside>

	<aside class="pane pages">
		<div class="pane-head">
			<span class="row-label">{viewSection || 'Loose pages'}</span>
			{#if data.sections.length}
				<button class="mini" title="New page here" onclick={() => createPage(viewSection)}>＋</button>
			{/if}
		</div>
		<ul>
			{#each viewPages as p (p.id)}
				<li class="page-row">
					<button class="row" class:on={p.id === pageId} onclick={() => openPage(p.id)}>
						<span class="row-label">
							{p.id === pageId ? title || 'Untitled page' : p.title || 'Untitled page'}
						</span>
					</button>
					<button class="del" title="Delete page" onclick={() => removePage(p)}>✕</button>
				</li>
			{:else}
				<li class="none">No pages here.</li>
			{/each}
		</ul>
	</aside>

	<div class="editor">
		{#if pageId !== null}
			<div class="editor-head">
				<input class="title" bind:value={title} oninput={scheduleSave} placeholder="Page title" />
				<span class="status" class:error={saveState === 'error'}>
					{saveState === 'saved' ? '✓ saved' : saveState === 'saving' ? 'saving…' : 'save failed'}
				</span>
				<button onclick={() => (showPreview = !showPreview)}>
					{showPreview ? 'Edit' : 'Preview'}
				</button>
			</div>
			<label class="move">
				Section
				<input bind:value={pageSection} oninput={onSectionEdit} list="journal-sections" placeholder="none" />
				<datalist id="journal-sections">
					{#each data.sections as s (s.name)}
						{#if s.name}<option value={s.name}></option>{/if}
					{/each}
				</datalist>
			</label>
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
		{:else}
			<div class="blank">
				<p>
					Your campaign's encyclopedia — spells, pantheons, lore, houserules.<br />
					Create a section to get the first page.
				</p>
			</div>
		{/if}
	</div>
</div>

<style>
	.workspace {
		display: grid;
		grid-template-columns: 180px 210px minmax(0, 1fr);
		gap: 0.8rem;
		align-items: stretch;
		min-height: calc(100vh - 7rem);
	}
	@media (max-width: 900px) {
		.workspace {
			grid-template-columns: 1fr;
			min-height: 0;
		}
	}
	.pane {
		background: var(--panel);
		border: 1px solid var(--border);
		border-radius: 10px;
		padding: 0.6rem 0.6rem;
		display: flex;
		flex-direction: column;
		gap: 0.4rem;
		min-height: 0;
	}
	.pane-head {
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: 0.4rem;
		font-size: 0.78rem;
		text-transform: uppercase;
		letter-spacing: 0.06em;
		color: var(--muted);
		padding: 0.2rem 0.4rem;
	}
	.pane ul {
		list-style: none;
		margin: 0;
		padding: 0;
		display: grid;
		gap: 0.1rem;
		overflow-y: auto;
		flex: 1;
	}
	.row {
		display: flex;
		justify-content: space-between;
		align-items: baseline;
		gap: 0.4rem;
		width: 100%;
		background: transparent;
		border: none;
		border-radius: 6px;
		padding: 0.32rem 0.45rem;
		text-align: left;
		color: var(--text);
		font-size: 0.88rem;
		min-width: 0;
	}
	.row:hover {
		background: var(--panel-2);
	}
	.row.on {
		background: rgba(127, 191, 127, 0.1);
		color: var(--accent);
	}
	.row small {
		color: var(--muted);
		flex-shrink: 0;
	}
	.row-label {
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
	.page-row {
		display: flex;
		align-items: center;
	}
	.page-row .row {
		flex: 1;
	}
	.del {
		background: transparent;
		border: none;
		color: var(--muted);
		padding: 0 0.25rem;
		opacity: 0;
	}
	.page-row:hover .del {
		opacity: 1;
	}
	.del:hover {
		color: var(--danger);
	}
	.none {
		color: var(--muted);
		font-size: 0.85rem;
		padding: 0.3rem 0.45rem;
	}
	.ghost {
		background: transparent;
		border: 1px dashed var(--border);
		color: var(--muted);
		font-size: 0.82rem;
		padding: 0.3rem 0.5rem;
	}
	.ghost:hover {
		border-color: var(--accent);
		color: var(--text);
	}
	.mini {
		font-size: 0.82rem;
		padding: 0.02rem 0.45rem;
	}
	form input {
		width: 100%;
		box-sizing: border-box;
		font-size: 0.85rem;
	}

	.editor {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
		min-width: 0;
	}
	.editor-head {
		display: flex;
		align-items: center;
		gap: 0.6rem;
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
	.move {
		display: flex;
		align-items: center;
		gap: 0.4rem;
		font-size: 0.78rem;
		color: var(--muted);
	}
	.move input {
		font-size: 0.82rem;
		width: 12rem;
	}
	.editor textarea {
		flex: 1;
		width: 100%;
		box-sizing: border-box;
		min-height: 60vh;
		resize: vertical;
		font: inherit;
		line-height: 1.6;
		padding: 0.9rem 1rem;
	}
	.preview {
		flex: 1;
		background: var(--panel);
		border: 1px solid var(--border);
		border-radius: 10px;
		padding: 1rem 1.4rem;
		min-height: 60vh;
		line-height: 1.6;
		overflow-x: auto;
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
	.blank {
		flex: 1;
		display: flex;
		align-items: center;
		justify-content: center;
		border: 2px dashed var(--border);
		border-radius: 10px;
		color: var(--muted);
		text-align: center;
		line-height: 1.7;
	}
</style>
