<script lang="ts">
	import { invalidateAll } from '$app/navigation';
	import { confirmDialog } from '$lib/confirm.svelte';
	let { data } = $props();

	let editing = $state<null | { id: number | null }>(null);
	let fName = $state('');
	let fTitle = $state('');
	let fDesc = $state('');
	let fNotes = $state('');
	let fFolder = $state('');
	let fileInput: HTMLInputElement | undefined = $state();
	let errorMsg = $state('');
	let saving = $state(false);

	function openNew() {
		editing = { id: null };
		fName = '';
		fTitle = '';
		fDesc = '';
		fNotes = '';
		fFolder = data.group;
		errorMsg = '';
	}
	function openEdit(c: any) {
		editing = { id: c.id };
		fName = c.name;
		fTitle = c.title;
		fDesc = c.description;
		fNotes = c.notes;
		fFolder = c.folder;
		errorMsg = '';
	}
	function close() {
		editing = null;
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
				<button onclick={() => openEdit(c)} title="Edit">✎</button>
				<button class="del" onclick={() => remove(c)} title="Delete">✕</button>
			</div>
			<button class="canvas-toggle" class:on={c.onCanvas} onclick={() => toggleCanvas(c)}>
				{c.onCanvas ? '– Remove from canvas' : '＋ Send to canvas'}
			</button>
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
			<label>Portrait <input type="file" bind:this={fileInput} accept=".png,.jpg,.jpeg,.webp,.gif" /></label>
			{#if errorMsg}<p class="err">{errorMsg}</p>{/if}
			<button class="primary" type="submit" disabled={saving}>
				{saving ? 'Saving…' : editing.id ? 'Save changes' : 'Add character'}
			</button>
		</form>
	</aside>
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
	.canvas-toggle {
		margin: 0.35rem 0.7rem 0.7rem;
		font-size: 0.8rem;
		padding: 0.25rem 0.5rem;
		color: var(--muted);
	}
	.canvas-toggle.on {
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
</style>
