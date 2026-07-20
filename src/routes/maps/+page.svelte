<script lang="ts">
	import { invalidateAll } from '$app/navigation';
	import { confirmDialog } from '$lib/confirm.svelte';
	import { TAGS } from '$lib/tags';
	let { data } = $props();

	let uploading = $state(false);
	let uploadError = $state('');
	let fileInput: HTMLInputElement;
	let nameInput = $state('');
	let editingId = $state<number | null>(null);
	let editTags = $state('');

	async function upload(e: SubmitEvent) {
		e.preventDefault();
		const file = fileInput.files?.[0];
		if (!file) return;
		uploading = true;
		uploadError = '';
		try {
			const form = new FormData();
			form.set('file', file);
			form.set('name', nameInput);
			const res = await fetch('/api/maps', { method: 'POST', body: form });
			const body = await res.json();
			if (!res.ok) uploadError = body.error ?? 'Upload failed.';
			else {
				nameInput = '';
				fileInput.value = '';
				invalidateAll();
			}
		} catch {
			uploadError = 'Upload failed.';
		} finally {
			uploading = false;
		}
	}

	async function remove(id: number, name: string) {
		const ok = await confirmDialog({
			title: 'Delete map?',
			message: `“${name}” will be deleted. Battles using it will ask for a new map.`,
			confirmLabel: 'Delete',
			danger: true
		});
		if (!ok) return;
		await fetch(`/api/maps/${id}`, { method: 'DELETE' });
		invalidateAll();
	}

	function startEdit(m: { id: number; tags: string }) {
		editingId = m.id;
		editTags = m.tags;
	}
	function pageUrl(p: number) {
		const params = new URLSearchParams();
		if (data.tag) params.set('tag', data.tag);
		if (p > 1) params.set('page', String(p));
		const qs = params.toString();
		return `/maps${qs ? `?${qs}` : ''}`;
	}
	// Windowed page numbers: 1 … around-current … last
	const pageNumbers = $derived.by(() => {
		const out: (number | '…')[] = [];
		for (let p = 1; p <= data.pages; p++) {
			if (p === 1 || p === data.pages || Math.abs(p - data.page) <= 2) out.push(p);
			else if (out[out.length - 1] !== '…') out.push('…');
		}
		return out;
	});

	async function saveTags(id: number) {
		await fetch(`/api/maps/${id}`, {
			method: 'PATCH',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ tags: editTags })
		});
		editingId = null;
		invalidateAll();
	}
</script>

<svelte:head><title>Maps · NilBot</title></svelte:head>

<h1>Battle Maps <span class="count">{data.total.toLocaleString()}</span></h1>
<p class="showing">
	{#if data.tag}
		{data.filtered.toLocaleString()} {data.tag === 'untagged' ? 'untagged' : data.tag} maps ·
	{/if}
	page {data.page} of {data.pages}
</p>
<p class="tip">
	Import any battle map image (PNG/JPG/WebP/GIF). “— 2MT” maps are by
	<a href="https://2minutetabletop.com" target="_blank" rel="noreferrer">2-Minute Tabletop</a>
	(CC BY-NC 4.0); “— DG” maps are by
	<a href="https://dicegrimorium.com" target="_blank" rel="noreferrer">Dice Grimorium</a>
	(free for personal games).
</p>

<form class="upload" onsubmit={upload}>
	<input type="file" bind:this={fileInput} accept=".png,.jpg,.jpeg,.webp,.gif" required />
	<input type="text" bind:value={nameInput} placeholder="Map name (optional)" />
	<button type="submit" disabled={uploading}>{uploading ? 'Importing…' : 'Import map'}</button>
</form>
{#if uploadError}<p class="err">{uploadError}</p>{/if}

<div class="filters">
	<a href="/maps" class:on={!data.tag}>all ({data.total})</a>
	{#each TAGS as t (t)}
		<a href="/maps?tag={t}" class:on={data.tag === t}>{t} ({data.tagCounts[t] ?? 0})</a>
	{/each}
	<a href="/maps?tag=untagged" class:on={data.tag === 'untagged'}>untagged ({data.untagged})</a>
</div>

<div class="grid">
	{#each data.maps as m (m.id)}
		<div class="card">
			<img src="/api/maps/{m.id}" alt={m.name} loading="lazy" />
			<div class="card-foot">
				<span class="name" title={m.name}>{m.name}</span>
				<button class="del" title="Delete" onclick={() => remove(m.id, m.name)}>✕</button>
			</div>
			{#if editingId === m.id}
				<div class="tag-edit">
					<input
						bind:value={editTags}
						placeholder="mountain, cave…"
						onkeydown={(e) => e.key === 'Enter' && saveTags(m.id)}
					/>
					<button onclick={() => saveTags(m.id)}>save</button>
				</div>
			{:else}
				<button class="tags" onclick={() => startEdit(m)} title="Click to edit tags">
					{#if m.tags}
						{#each m.tags.split(',') as t (t)}<span class="chip">{t}</span>{/each}
					{:else}
						<span class="chip empty-chip">+ tags</span>
					{/if}
				</button>
			{/if}
		</div>
	{:else}
		<p class="empty">No maps match this filter.</p>
	{/each}
</div>

{#if data.pages > 1}
	<nav class="pager">
		{#if data.page > 1}<a href={pageUrl(data.page - 1)}>←</a>{/if}
		{#each pageNumbers as p, i (i)}
			{#if p === '…'}
				<span class="gap">…</span>
			{:else}
				<a href={pageUrl(p)} class:on={p === data.page}>{p}</a>
			{/if}
		{/each}
		{#if data.page < data.pages}<a href={pageUrl(data.page + 1)}>→</a>{/if}
	</nav>
{/if}

<style>
	.count {
		font-size: 1rem;
		color: var(--muted);
		background: var(--panel-2);
		border: 1px solid var(--border);
		border-radius: 99px;
		padding: 0.15rem 0.7rem;
		vertical-align: middle;
	}
	.showing {
		color: var(--muted);
		font-size: 0.9rem;
		margin: -0.4rem 0 0.6rem;
	}
	.tip {
		color: var(--muted);
	}
	.upload {
		display: flex;
		gap: 0.5rem;
		flex-wrap: wrap;
		align-items: center;
		margin-bottom: 0.75rem;
	}
	.err {
		color: var(--danger);
	}
	.filters {
		display: flex;
		flex-wrap: wrap;
		gap: 0.35rem;
		margin-bottom: 1rem;
	}
	.filters a {
		text-decoration: none;
		color: var(--muted);
		border: 1px solid var(--border);
		border-radius: 99px;
		padding: 0.15rem 0.7rem;
		font-size: 0.85rem;
	}
	.filters a:hover {
		color: var(--text);
		border-color: var(--accent);
	}
	.filters a.on {
		color: var(--accent);
		border-color: var(--accent);
		background: rgba(127, 191, 127, 0.08);
	}
	.grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
		gap: 1rem;
	}
	.card {
		background: var(--panel);
		border: 1px solid var(--border);
		border-radius: 8px;
		overflow: hidden;
	}
	.card img {
		width: 100%;
		aspect-ratio: 4 / 3;
		object-fit: cover;
		display: block;
	}
	.card-foot {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 0.4rem 0.6rem 0.1rem;
		font-size: 0.9rem;
	}
	.name {
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
	.del {
		background: transparent;
		border: none;
		color: var(--muted);
		padding: 0 0.2rem;
	}
	.del:hover {
		color: var(--danger);
	}
	.tags {
		display: flex;
		flex-wrap: wrap;
		gap: 0.25rem;
		background: transparent;
		border: none;
		padding: 0.25rem 0.6rem 0.5rem;
		text-align: left;
		width: 100%;
	}
	.tags:hover {
		border: none;
	}
	.chip {
		font-size: 0.7rem;
		color: var(--muted);
		border: 1px solid var(--border);
		border-radius: 99px;
		padding: 0.05rem 0.45rem;
	}
	.empty-chip {
		opacity: 0.6;
	}
	.tag-edit {
		display: flex;
		gap: 0.3rem;
		padding: 0.25rem 0.6rem 0.5rem;
	}
	.tag-edit input {
		flex: 1;
		font-size: 0.8rem;
		padding: 0.2rem 0.4rem;
	}
	.tag-edit button {
		font-size: 0.8rem;
		padding: 0.2rem 0.5rem;
	}
	.empty {
		color: var(--muted);
	}
	.pager {
		display: flex;
		gap: 0.3rem;
		align-items: center;
		margin-top: 1.2rem;
		flex-wrap: wrap;
	}
	.pager a {
		text-decoration: none;
		color: var(--muted);
		border: 1px solid var(--border);
		border-radius: 6px;
		min-width: 2rem;
		text-align: center;
		padding: 0.2rem 0.4rem;
		font-size: 0.9rem;
	}
	.pager a:hover {
		border-color: var(--accent);
		color: var(--text);
	}
	.pager a.on {
		color: var(--accent);
		border-color: var(--accent);
		background: rgba(127, 191, 127, 0.08);
	}
	.gap {
		color: var(--muted);
		padding: 0 0.2rem;
	}
</style>
