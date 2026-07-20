<script lang="ts">
	import { goto, invalidateAll } from '$app/navigation';
	import { browser } from '$app/environment';
	import { confirmDialog } from '$lib/confirm.svelte';
	import RichText from '$lib/components/RichText.svelte';

	let { data } = $props();

	// Hide the sections/pages columns for a distraction-free page.
	let navHidden = $state(browser && localStorage.getItem('nb-journal-nav') === '1');
	function toggleNav() {
		navHidden = !navHidden;
		localStorage.setItem('nb-journal-nav', navHidden ? '1' : '0');
	}

	// OneNote-ish section colors, stable per name.
	const PALETTE = ['#c86baa', '#7a63c8', '#5b8dd6', '#58a68f', '#c8a24b', '#c0605e', '#6aa84f', '#b07d3c'];
	function sectionColor(name: string): string {
		let h = 0;
		for (const ch of name) h = (h * 31 + ch.charCodeAt(0)) % 997;
		return PALETTE[h % PALETTE.length];
	}

	// --- Selected page (resynced only when the id changes) ---
	let pageId = $state(data.selected?.id ?? null);
	let title = $state(data.selected?.title ?? '');
	let content = $state(data.selected?.content ?? '');
	let saveState = $state<'saved' | 'saving' | 'error'>('saved');
	let viewSection = $state(data.selected?.section ?? data.sections[0]?.name ?? '');

	$effect(() => {
		if ((data.selected?.id ?? null) === pageId) return;
		pageId = data.selected?.id ?? null;
		title = data.selected?.title ?? '';
		content = data.selected?.content ?? '';
		viewSection = data.selected?.section ?? data.sections[0]?.name ?? '';
		saveState = 'saved';
	});

	const viewPages = $derived(data.sections.find((s: any) => s.name === viewSection)?.pages ?? []);
	const accent = $derived(sectionColor(viewSection));

	let saveTimer: ReturnType<typeof setTimeout>;
	function scheduleSave() {
		if (pageId === null) return;
		saveState = 'saving';
		clearTimeout(saveTimer);
		saveTimer = setTimeout(save, 1000);
	}
	async function save() {
		if (pageId === null) return;
		try {
			const res = await fetch(`/api/journal/${pageId}`, {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ title, content })
			});
			saveState = res.ok ? 'saved' : 'error';
			invalidateAll(); // page rail titles follow the title field
		} catch {
			saveState = 'error';
		}
	}

	function openPage(id: number) {
		if (id !== pageId) goto(`/journal?p=${id}`, { noScroll: true });
	}

	// --- Sections ---
	let addingSection = $state(false);
	let newSection = $state('');
	let renaming = $state<string | null>(null);
	let renameDraft = $state('');

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
	async function renameSection(e: SubmitEvent) {
		e.preventDefault();
		const to = renameDraft.trim();
		const from = renaming;
		renaming = null;
		if (!to || to === from || from === null) return;
		await fetch('/api/journal', {
			method: 'PATCH',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ from, to })
		});
		if (viewSection === from) viewSection = to;
		await invalidateAll();
	}
	async function removeSection(s: { name: string; pages: any[] }) {
		const count = s.pages.reduce((n: number, p: any) => n + 1 + p.subs.length, 0);
		const ok = await confirmDialog({
			title: 'Delete section?',
			message: `“${s.name || 'Loose pages'}” and its ${count} page(s) will be deleted.`,
			confirmLabel: 'Delete section',
			danger: true
		});
		if (!ok) return;
		await fetch('/api/journal', {
			method: 'DELETE',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ section: s.name })
		});
		await goto('/journal', { noScroll: true });
		await invalidateAll();
	}

	// --- Pages: indent (make subpage of previous top-level page) / promote ---
	async function setParent(id: number, parentId: number | null) {
		await fetch(`/api/journal/${id}`, {
			method: 'PUT',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ parent_id: parentId })
		});
		await invalidateAll();
	}
	async function removePage(p: { id: number; title: string }) {
		const ok = await confirmDialog({
			title: 'Delete page?',
			message: `“${p.title || 'Untitled page'}” will be deleted. Its subpages stay, promoted a level.`,
			confirmLabel: 'Delete',
			danger: true
		});
		if (!ok) return;
		await fetch(`/api/journal/${p.id}`, { method: 'DELETE' });
		if (p.id === pageId) await goto('/journal', { noScroll: true });
		await invalidateAll();
	}
</script>

<svelte:head><title>Journal · NilBot</title></svelte:head>

{#snippet pageRow(p: any, sub: boolean, prevTopId: number | null)}
	<li class="page-row" class:sub>
		<button class="row" class:on={p.id === pageId} onclick={() => openPage(p.id)}>
			<span class="row-label">
				{p.id === pageId ? title || 'Untitled page' : p.title || 'Untitled page'}
			</span>
		</button>
		<span class="row-btns">
			{#if sub}
				<button class="mini-op" title="Promote to page" onclick={() => setParent(p.id, null)}>←</button>
			{:else if prevTopId !== null}
				<button class="mini-op" title="Make subpage of the page above" onclick={() => setParent(p.id, prevTopId)}>→</button>
			{/if}
			<button class="mini-op del" title="Delete page" onclick={() => removePage(p)}>✕</button>
		</span>
	</li>
{/snippet}

<div class="workspace" class:nav-hidden={navHidden} style="--sec: {accent}">
	{#if navHidden}
		<div class="nav-rail">
			<button class="rail-btn" title="Show sections and pages" onclick={toggleNav}>☰</button>
		</div>
	{/if}
	<aside class="pane sections" class:hide={navHidden}>
		<div class="pane-head">Sections</div>
		<ul>
			{#each data.sections as s (s.name)}
				<li class="sec-row">
					{#if renaming === s.name}
						<form class="rename" onsubmit={renameSection}>
							<!-- svelte-ignore a11y_autofocus -->
							<input
								bind:value={renameDraft}
								autofocus
								onblur={() => (renaming = null)}
							/>
						</form>
					{:else}
						<button
							class="row"
							class:on={s.name === viewSection}
							style="--sec: {sectionColor(s.name)}"
							onclick={() => (viewSection = s.name)}
						>
							<span class="swatch"></span>
							<span class="row-label">{s.name || 'Loose pages'}</span>
						</button>
						<span class="row-btns">
							{#if s.name}
								<button
									class="mini-op"
									title="Rename section"
									onclick={() => {
										renaming = s.name;
										renameDraft = s.name;
									}}>✎</button
								>
							{/if}
							<button class="mini-op del" title="Delete section" onclick={() => removeSection(s)}>✕</button>
						</span>
					{/if}
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
			<button class="ghost" onclick={() => (addingSection = true)}>＋ Section</button>
		{/if}
	</aside>

	<aside class="pane pages" class:hide={navHidden}>
		<div class="pane-head head-colored">
			<span class="row-label">{viewSection || 'Loose pages'}</span>
			<button class="mini-op" title="Hide sections and pages" onclick={toggleNav}>⟨</button>
		</div>
		<ul>
			{#each viewPages as p, i (p.id)}
				{@render pageRow(p, false, i > 0 ? viewPages[i - 1].id : null)}
				{#each p.subs as sp (sp.id)}
					{@render pageRow(sp, true, null)}
				{/each}
			{:else}
				<li class="none">No pages here.</li>
			{/each}
		</ul>
		{#if data.sections.length}
			<button class="ghost" onclick={() => createPage(viewSection)}>＋ Page</button>
		{/if}
	</aside>

	<div class="editor">
		{#if pageId !== null}
			<div class="title-block">
				<input class="title" bind:value={title} oninput={scheduleSave} placeholder="Untitled page" />
				<div class="title-meta">
					<span>{data.selected?.updated_at?.slice(0, 16) ?? ''}</span>
					<span class="status" class:error={saveState === 'error'}>
						{saveState === 'saved' ? '✓' : saveState === 'saving' ? '…' : 'save failed'}
					</span>
				</div>
			</div>
			{#key pageId}
				<RichText
					initial={content}
					onchange={(html) => {
						content = html;
						scheduleSave();
					}}
				/>
			{/key}
		{:else}
			<div class="blank">
				<p>
					Your campaign's encyclopedia — spells, pantheons, lore, houserules.<br />
					Create a section to get the first page. Pasting from OneNote keeps the formatting.
				</p>
			</div>
		{/if}
	</div>
</div>

<style>
	/* One continuous surface, OneNote-style: the whole content area, flat
	   columns split by hairlines, no container box at all. */
	.workspace {
		display: grid;
		grid-template-columns: 185px 215px minmax(0, 1fr);
		align-items: stretch;
		height: 100vh;
		background: var(--panel);
	}
	@media (max-width: 900px) {
		.workspace {
			grid-template-columns: 1fr;
			height: auto;
		}
		.pane {
			border-right: none !important;
			border-bottom: 1px solid var(--border);
		}
	}
	.pane {
		border-right: 1px solid var(--border);
		padding: 0.55rem 0.45rem;
		display: flex;
		flex-direction: column;
		gap: 0.4rem;
		min-height: 0;
		overflow: hidden;
	}
	.pane.pages {
		background: color-mix(in srgb, var(--panel) 60%, var(--bg));
	}
	.pane-head {
		font-size: 0.76rem;
		text-transform: uppercase;
		letter-spacing: 0.07em;
		color: var(--muted);
		padding: 0.2rem 0.4rem;
	}
	.head-colored {
		color: var(--sec);
		border-bottom: 2px solid var(--sec);
		padding-bottom: 0.35rem;
		font-weight: 600;
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: 0.3rem;
	}
	.workspace.nav-hidden {
		grid-template-columns: 2.4rem minmax(0, 1fr);
	}
	.pane.hide {
		display: none;
	}
	.nav-rail {
		border-right: 1px solid var(--border);
		padding-top: 0.55rem;
		display: flex;
		justify-content: center;
		align-items: flex-start;
	}
	.rail-btn {
		background: transparent;
		border: none;
		color: var(--muted);
		font-size: 0.95rem;
		padding: 0.2rem 0.4rem;
	}
	.rail-btn:hover {
		color: var(--accent);
	}
	.pane ul {
		list-style: none;
		margin: 0;
		padding: 0;
		display: grid;
		gap: 0.1rem;
		overflow-y: auto;
		flex: 1;
		align-content: start;
	}
	.sec-row,
	.page-row {
		display: flex;
		align-items: center;
		min-width: 0;
	}
	.row {
		display: flex;
		align-items: center;
		gap: 0.45rem;
		flex: 1;
		background: transparent;
		border: none;
		border-radius: 6px;
		padding: 0.34rem 0.45rem;
		text-align: left;
		color: var(--text);
		font-size: 0.88rem;
		min-width: 0;
	}
	.row:hover {
		background: var(--panel-2);
	}
	.sections .row.on {
		background: color-mix(in srgb, var(--sec) 16%, transparent);
	}
	.pages .row.on {
		background: color-mix(in srgb, var(--sec) 16%, transparent);
		box-shadow: inset 2px 0 0 var(--sec);
	}
	.swatch {
		width: 9px;
		height: 9px;
		border-radius: 3px;
		background: var(--sec);
		flex-shrink: 0;
	}
	.row-label {
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
	.page-row.sub {
		padding-left: 1.1rem;
	}
	.page-row.sub .row {
		font-size: 0.84rem;
		color: var(--muted);
	}
	.page-row.sub .row.on {
		color: var(--text);
	}
	.row-btns {
		display: flex;
		flex-shrink: 0;
		opacity: 0;
	}
	.sec-row:hover .row-btns,
	.page-row:hover .row-btns {
		opacity: 1;
	}
	.mini-op {
		background: transparent;
		border: none;
		color: var(--muted);
		font-size: 0.78rem;
		padding: 0.1rem 0.22rem;
	}
	.mini-op:hover {
		color: var(--text);
	}
	.mini-op.del:hover {
		color: var(--danger);
	}
	.none {
		color: var(--muted);
		font-size: 0.85rem;
		padding: 0.3rem 0.45rem;
	}
	/* Flat "+ Page" rows like OneNote, not boxed buttons. */
	.ghost {
		background: transparent;
		border: none;
		border-top: 1px solid var(--border);
		border-radius: 0;
		color: var(--muted);
		font-size: 0.84rem;
		padding: 0.45rem 0.5rem 0.2rem;
		text-align: left;
	}
	.ghost:hover {
		color: var(--accent);
	}
	form input,
	.rename input {
		width: 100%;
		box-sizing: border-box;
		font-size: 0.85rem;
	}
	.rename {
		flex: 1;
	}

	.editor {
		display: flex;
		flex-direction: column;
		gap: 0;
		min-width: 0;
		min-height: 0;
		overflow: hidden;
		background: var(--bg);
	}
	.title-block {
		border-bottom: 2px solid var(--sec);
		margin: 0.9rem 1.4rem 0;
		padding-bottom: 0.35rem;
	}
	.title {
		width: 100%;
		box-sizing: border-box;
		font-size: 1.45rem;
		font-family: var(--serif);
		background: transparent;
		border: none;
		border-radius: 0;
		padding: 0.15rem 0.1rem;
		color: var(--text);
	}
	.title:focus {
		outline: none;
	}
	.title-meta {
		display: flex;
		gap: 0.7rem;
		align-items: baseline;
		color: var(--muted);
		font-size: 0.78rem;
		padding: 0 0.15rem;
	}
	.status.error {
		color: var(--danger);
	}
	.blank {
		flex: 1;
		display: flex;
		align-items: center;
		justify-content: center;
		color: var(--muted);
		text-align: center;
		line-height: 1.7;
		min-height: 60vh;
	}
</style>
