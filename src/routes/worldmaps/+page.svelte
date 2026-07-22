<script lang="ts">
	import { invalidateAll } from '$app/navigation';
	import { confirmDialog } from '$lib/confirm.svelte';
	let { data } = $props();

	let uploading = $state(false);
	let uploadError = $state('');
	let fileInput: HTMLInputElement;
	let nameInput = $state('');

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
			form.set('kind', 'world');
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
			title: 'Delete world map?',
			message: `“${name}” will be deleted.`,
			confirmLabel: 'Delete',
			danger: true
		});
		if (!ok) return;
		await fetch(`/api/maps/${id}`, { method: 'DELETE' });
		invalidateAll();
	}
</script>

<svelte:head><title>World Maps · NilBot</title></svelte:head>

<h1>🌍 The Atlas</h1>
<p class="tip">
	Your world, region, and city maps. <b>▶ Present</b> shows one on the TV with zoom and pan.
</p>

<form class="upload" onsubmit={upload}>
	<input type="file" bind:this={fileInput} accept=".png,.jpg,.jpeg,.webp,.gif" required />
	<input type="text" bind:value={nameInput} placeholder="Map name (optional)" />
	<button type="submit" disabled={uploading}>{uploading ? 'Importing…' : 'Import world map'}</button>
</form>
{#if uploadError}<p class="err">{uploadError}</p>{/if}

<div class="grid">
	{#each data.maps as m (m.id)}
		<div class="card">
			<img src="/api/maps/{m.id}" alt={m.name} loading="lazy" />
			<div class="card-foot">
				<span class="name" title={m.name}>{m.name}</span>
				<a class="present" href="/present/map/{m.id}" target="_blank">▶ Present</a>
				<button class="del" title="Delete" onclick={() => remove(m.id, m.name)}>✕</button>
			</div>
		</div>
	{:else}
		<p class="empty">No world maps yet — import your realm.</p>
	{/each}
</div>

<style>
	.tip {
		color: var(--muted);
	}
	.upload {
		display: flex;
		gap: 0.5rem;
		flex-wrap: wrap;
		align-items: center;
		margin-bottom: 1rem;
	}
	.err {
		color: var(--danger);
	}
	.grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
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
		aspect-ratio: 16 / 10;
		object-fit: cover;
		display: block;
	}
	.card-foot {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.45rem 0.6rem;
		font-size: 0.9rem;
	}
	.name {
		flex: 1;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
	.present {
		text-decoration: none;
		background: var(--accent-2);
		border: 1px solid var(--accent-2);
		color: var(--text);
		border-radius: 6px;
		padding: 0.2rem 0.6rem;
		font-size: 0.82rem;
		font-weight: 600;
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
	.empty {
		color: var(--muted);
	}
</style>
