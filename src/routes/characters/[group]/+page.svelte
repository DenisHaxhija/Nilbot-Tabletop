<script lang="ts">
	import { invalidateAll } from '$app/navigation';
	import { confirmDialog } from '$lib/confirm.svelte';
	import StatBlock from '$lib/components/StatBlock.svelte';
	let { data } = $props();

	let editing = $state<null | { id: number | null }>(null);
	let fName = $state('');
	let fTitle = $state('');
	let fDesc = $state('');
	let fNotes = $state('');
	let fFolder = $state('');
	let fSheetSlug = $state('');
	let fSheetName = $state('');
	let fileInput: HTMLInputElement | undefined = $state();
	let errorMsg = $state('');
	let saving = $state(false);

	// Stat-sheet picker (searches the bestiary incl. Custom sheets).
	let sheetQuery = $state('');
	let sheetResults = $state<any[]>([]);
	let searchTimer: ReturnType<typeof setTimeout>;
	function onSheetQuery() {
		clearTimeout(searchTimer);
		searchTimer = setTimeout(async () => {
			const q = sheetQuery.trim();
			if (!q) {
				sheetResults = [];
				return;
			}
			const res = await fetch(`/api/monsters/search?q=${encodeURIComponent(q)}`);
			sheetResults = (await res.json()).results;
		}, 200);
	}
	function pickSheet(r: any) {
		fSheetSlug = r.slug;
		fSheetName = r.name;
		sheetQuery = '';
		sheetResults = [];
	}
	function unlinkSheet() {
		fSheetSlug = '';
		fSheetName = '';
	}

	// Slide-over showing a character's linked stat sheet.
	let sheetView = $state<null | { meta: any; monster: any }>(null);
	let sheetViewLoading = $state(false);
	async function viewSheet(slug: string) {
		sheetViewLoading = true;
		try {
			const res = await fetch(`/api/monster/${encodeURIComponent(slug)}`);
			if (res.ok) sheetView = await res.json();
		} finally {
			sheetViewLoading = false;
		}
	}

	function openNew() {
		editing = { id: null };
		fName = '';
		fTitle = '';
		fDesc = '';
		fNotes = '';
		fFolder = data.group;
		fSheetSlug = '';
		fSheetName = '';
		errorMsg = '';
	}
	function openEdit(c: any) {
		editing = { id: c.id };
		fName = c.name;
		fTitle = c.title;
		fDesc = c.description;
		fNotes = c.notes;
		fFolder = c.folder;
		fSheetSlug = c.sheetSlug;
		fSheetName = c.sheetName ?? '';
		errorMsg = '';
	}
	function close() {
		editing = null;
		sheetView = null;
		sheetQuery = '';
		sheetResults = [];
		if (fileInput) fileInput.value = '';
	}

	async function save(e: SubmitEvent) {
		e.preventDefault();
		saving = true;
		errorMsg = '';
		try {
			const form = new FormData();
			form.set('name', fName);
			form.set('title', fTitle);
			form.set('description', fDesc);
			form.set('notes', fNotes);
			form.set('folder', fFolder);
			form.set('sheet_slug', fSheetSlug);
			const file = fileInput?.files?.[0];
			if (file) form.set('file', file);
			const url = editing?.id ? `/api/characters/${editing.id}` : '/api/characters';
			const res = await fetch(url, { method: 'POST', body: form });
			const body = await res.json();
			if (!res.ok) {
				errorMsg = body.error ?? 'Saving failed.';
				return;
			}
			close();
			invalidateAll();
		} catch {
			errorMsg = 'Request failed.';
		} finally {
			saving = false;
		}
	}

	async function remove(c: any) {
		const ok = await confirmDialog({
			title: 'Delete character?',
			message: `${c.name} will be removed from your gallery.`,
			confirmLabel: 'Delete',
			danger: true
		});
		if (!ok) return;
		await fetch(`/api/characters/${c.id}`, { method: 'DELETE' });
		invalidateAll();
	}

	async function toggleCanvas(c: any) {
		await fetch(`/api/characters/${c.id}/canvas`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ on: !c.onCanvas })
		});
		invalidateAll();
	}

	async function toggleHideName(c: any) {
		await fetch(`/api/characters/${c.id}/canvas`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ hideName: !c.hideName })
		});
		invalidateAll();
	}

	function onKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape') close();
	}
</script>

<svelte:head><title>{data.group || 'Ungrouped'} · Characters · NilBot</title></svelte:head>
<svelte:window onkeydown={onKeydown} />

<p><a href="/characters">← All groups</a></p>

<div class="head">
	<h1>{data.group || 'Ungrouped'}</h1>
	<div class="head-actions">
		<a class="canvas-link" href="/present/canvas" target="_blank">🖼 Open canvas</a>
		<button class="new-btn" onclick={openNew}>＋ New character</button>
	</div>
</div>

{#if data.characters.length === 0}
	<p class="empty">Nobody here yet.</p>
{/if}

<div class="grid">
	{#each data.characters as c (c.id)}
		<div class="card">
			{#if c.img}
				<img src={c.img} alt={c.name} loading="lazy" />
			{:else}
				<div class="no-img">?</div>
			{/if}
			<div class="body">
				<b>{c.name}</b>
				{#if c.title}<small>{c.title}</small>{/if}
			</div>
			<div class="actions">
				<a class="present" href="/present/char/{c.id}" target="_blank">▶ Present</a>
				{#if c.sheetSlug}
					<button
						class="sheet-btn"
						onclick={() => viewSheet(c.sheetSlug)}
						title="Stat sheet: {c.sheetName ?? c.sheetSlug}">📜</button
					>
				{/if}
				<button onclick={() => openEdit(c)} title="Edit">✎</button>
				<button class="del" onclick={() => remove(c)} title="Delete">✕</button>
			</div>
			<div class="canvas-row">
				<button class="canvas-toggle" class:on={c.onCanvas} onclick={() => toggleCanvas(c)}>
					{c.onCanvas ? '– Remove from canvas' : '＋ Send to canvas'}
				</button>
				<button
					class="mask-toggle"
					class:on={c.hideName}
					title={c.hideName
						? 'Name hidden — shows as ??? on the canvas'
						: 'Hide name — show as ??? on the canvas'}
					onclick={() => toggleHideName(c)}>🎭</button
				>
			</div>
		</div>
	{/each}
</div>

{#if editing}
	<div
		class="sheet-backdrop"
		role="button"
		tabindex="-1"
		onclick={close}
		onkeydown={(e) => e.key === 'Enter' && close()}
	></div>
	<aside class="sheet">
		<button class="close" onclick={close}>✕ close</button>
		<h3>{editing.id ? 'Edit character' : 'New character'}</h3>
		<form onsubmit={save}>
			<label>Name <input bind:value={fName} required /></label>
			<label>Title / role <input bind:value={fTitle} placeholder="e.g. Archmage of the Veiled Tower" /></label>
			<label>
				Group
				<input bind:value={fFolder} list="folder-list" placeholder="leave empty for ungrouped" />
				<datalist id="folder-list">
					{#each data.folders as f (f)}<option value={f}></option>{/each}
				</datalist>
			</label>
			<label>
				Description <small class="note">(shown to players when presented)</small>
				<textarea bind:value={fDesc} rows="6"></textarea>
			</label>
			<label>
				DM notes <small class="note">(never shown)</small>
				<textarea bind:value={fNotes} rows="4"></textarea>
			</label>
			<div class="sheet-link">
				<span class="lbl">Stat sheet <small class="note">(from the bestiary, DM-only)</small></span>
				{#if fSheetSlug}
					<div class="linked">
						<span>📜 {fSheetName || fSheetSlug}</span>
						<button type="button" class="unlink" onclick={unlinkSheet} title="Unlink">✕</button>
					</div>
				{:else}
					<input
						bind:value={sheetQuery}
						oninput={onSheetQuery}
						placeholder="Search bestiary… e.g. archmage, or your Custom sheet"
					/>
					{#if sheetResults.length}
						<ul class="results">
							{#each sheetResults as r (r.slug)}
								<li>
									<button type="button" onclick={() => pickSheet(r)}>
										{#if r.img}<img src={r.img} alt="" />{/if}
										<span>{r.name}</span>
										<small>CR {r.cr_text ?? '—'} · {r.type ?? '?'}</small>
									</button>
								</li>
							{/each}
						</ul>
					{/if}
				{/if}
			</div>
			<label>Portrait <input type="file" bind:this={fileInput} accept=".png,.jpg,.jpeg,.webp,.gif" /></label>
			{#if errorMsg}<p class="err">{errorMsg}</p>{/if}
			<button class="primary" type="submit" disabled={saving}>
				{saving ? 'Saving…' : editing.id ? 'Save changes' : 'Add character'}
			</button>
		</form>
	</aside>
{/if}

{#if sheetView}
	<div
		class="sheet-backdrop"
		role="button"
		tabindex="-1"
		onclick={() => (sheetView = null)}
		onkeydown={(e) => e.key === 'Enter' && (sheetView = null)}
	></div>
	<aside class="sheet">
		<button class="close" onclick={() => (sheetView = null)}>✕ close</button>
		<StatBlock meta={sheetView.meta} monster={sheetView.monster} />
	</aside>
{:else if sheetViewLoading}
	<div class="sheet-backdrop loading">Loading sheet…</div>
{/if}

<style>
	.head {
		display: flex;
		justify-content: space-between;
		align-items: center;
		flex-wrap: wrap;
		gap: 0.5rem;
	}
	.head-actions {
		display: flex;
		gap: 0.5rem;
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
	.new-btn {
		font-size: 0.85rem;
		padding: 0.3rem 0.7rem;
	}
	.empty {
		color: var(--muted);
	}
	.grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(190px, 1fr));
		gap: 1rem;
	}
	.card {
		background: var(--panel);
		border: 1px solid var(--border);
		border-radius: 10px;
		overflow: hidden;
		display: grid;
	}
	.card img,
	.no-img {
		width: 100%;
		aspect-ratio: 1;
		object-fit: cover;
		object-position: top;
		display: block;
	}
	.no-img {
		display: flex;
		align-items: center;
		justify-content: center;
		background: var(--panel-2);
		color: var(--muted);
		font-size: 2.5rem;
		font-family: var(--serif);
	}
	.body {
		padding: 0.5rem 0.7rem 0.2rem;
		display: grid;
	}
	.body small {
		color: var(--muted);
		font-style: italic;
	}
	.actions {
		display: flex;
		align-items: center;
		gap: 0.35rem;
		padding: 0.4rem 0.7rem 0.2rem;
	}
	.present {
		flex: 1;
		text-align: center;
		text-decoration: none;
		background: var(--accent-2);
		border: 1px solid var(--accent-2);
		color: var(--text);
		border-radius: 6px;
		padding: 0.25rem 0.5rem;
		font-size: 0.85rem;
		font-weight: 600;
	}
	.actions button {
		background: transparent;
		border: none;
		color: var(--muted);
		padding: 0.15rem 0.3rem;
	}
	.actions button:hover {
		color: var(--text);
	}
	.actions .del:hover {
		color: var(--danger);
	}
	.canvas-row {
		display: flex;
		gap: 0.35rem;
		margin: 0.35rem 0.7rem 0.7rem;
	}
	.canvas-toggle {
		flex: 1;
		font-size: 0.8rem;
		padding: 0.25rem 0.5rem;
		color: var(--muted);
	}
	.canvas-toggle.on {
		color: var(--accent);
		border-color: var(--accent);
		background: rgba(127, 191, 127, 0.08);
	}
	.mask-toggle {
		font-size: 0.8rem;
		padding: 0.25rem 0.45rem;
		color: var(--muted);
		opacity: 0.65;
	}
	.mask-toggle.on {
		opacity: 1;
		color: var(--accent);
		border-color: var(--accent);
		background: rgba(127, 191, 127, 0.08);
	}
	.sheet-backdrop {
		position: fixed;
		inset: 0;
		background: rgba(0, 0, 0, 0.45);
		z-index: 40;
	}
	.sheet {
		position: fixed;
		top: 0;
		right: 0;
		bottom: 0;
		width: min(480px, 92vw);
		background: var(--bg);
		border-left: 1px solid var(--border);
		box-shadow: -8px 0 30px rgba(0, 0, 0, 0.5);
		z-index: 41;
		overflow-y: auto;
		padding: 0.9rem 1.2rem 2rem;
	}
	.close {
		margin-bottom: 0.4rem;
		font-size: 0.85rem;
	}
	.sheet h3 {
		color: var(--accent);
		margin: 0 0 0.8rem;
	}
	form {
		display: grid;
		gap: 0.8rem;
	}
	label {
		display: grid;
		gap: 0.25rem;
		font-size: 0.88rem;
		color: var(--muted);
	}
	.note {
		font-weight: 400;
		opacity: 0.8;
	}
	textarea {
		resize: vertical;
		font: inherit;
		line-height: 1.5;
	}
	.primary {
		background: var(--accent-2);
		border-color: var(--accent-2);
		font-weight: 600;
		justify-self: start;
	}
	.err {
		color: var(--danger);
		margin: 0;
	}
	.sheet-btn {
		font-size: 0.95rem;
	}
	.sheet-backdrop.loading {
		display: flex;
		align-items: center;
		justify-content: center;
		color: var(--muted);
	}
	.sheet-link {
		display: grid;
		gap: 0.25rem;
	}
	.sheet-link .lbl {
		font-size: 0.88rem;
		color: var(--muted);
	}
	.linked {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.5rem;
		border: 1px solid var(--border);
		border-radius: 6px;
		padding: 0.35rem 0.6rem;
	}
	.unlink {
		background: transparent;
		border: none;
		color: var(--muted);
		padding: 0 0.2rem;
	}
	.unlink:hover {
		color: var(--danger);
	}
	.results {
		list-style: none;
		margin: 0;
		padding: 0;
		border: 1px solid var(--border);
		border-radius: 6px;
		max-height: 240px;
		overflow-y: auto;
	}
	.results li + li {
		border-top: 1px solid var(--border);
	}
	.results button {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		width: 100%;
		background: transparent;
		border: none;
		border-radius: 0;
		padding: 0.4rem 0.6rem;
		text-align: left;
	}
	.results button:hover {
		background: var(--panel-2);
	}
	.results img {
		width: 28px;
		height: 28px;
		border-radius: 50%;
		object-fit: cover;
	}
	.results small {
		margin-left: auto;
		color: var(--muted);
		white-space: nowrap;
	}
</style>
