<script lang="ts">
	import { invalidateAll } from '$app/navigation';
	import { confirmDialog } from '$lib/confirm.svelte';
	let { data } = $props();

	let fName = $state('');
	let fGroup = $state('');
	let fUrl = $state('');
	let fileInput: HTMLInputElement | undefined = $state();
	let adding = $state(false);
	let errorMsg = $state('');

	// --- Player ---
	let audioEl: HTMLAudioElement | undefined = $state();
	let playing = $state<{ id: number; name: string; grp: string } | null>(null);
	let loop = $state(true);

	function play(s: any) {
		playing = { id: s.id, name: s.name, grp: s.grp };
		queueMicrotask(() => {
			if (audioEl) {
				audioEl.load();
				audioEl.play();
			}
		});
	}
	function stop() {
		audioEl?.pause();
		playing = null;
	}

	async function add(e: SubmitEvent) {
		e.preventDefault();
		adding = true;
		errorMsg = '';
		try {
			const form = new FormData();
			form.set('name', fName);
			form.set('grp', fGroup);
			form.set('url', fUrl);
			const file = fileInput?.files?.[0];
			if (file) form.set('file', file);
			const res = await fetch('/api/music', { method: 'POST', body: form });
			const body = await res.json();
			if (!res.ok) {
				errorMsg = body.error ?? 'Failed.';
				return;
			}
			fName = '';
			fUrl = '';
			if (fileInput) fileInput.value = '';
			invalidateAll();
		} catch {
			errorMsg = 'Request failed.';
		} finally {
			adding = false;
		}
	}

	async function remove(s: any) {
		const ok = await confirmDialog({
			title: 'Delete song?',
			message: `“${s.name}” will be removed.`,
			confirmLabel: 'Delete',
			danger: true
		});
		if (!ok) return;
		if (playing?.id === s.id) stop();
		await fetch(`/api/music/${s.id}`, { method: 'DELETE' });
		invalidateAll();
	}
</script>

<svelte:head><title>Music · NilBot</title></svelte:head>

<h1>Music</h1>
<p class="tip">
	Your table soundtrack, grouped by mood or scene. Upload audio files to play them right here
	(looping, for ambience), or add Spotify/YouTube links to open externally.
</p>

<form class="add" onsubmit={add}>
	<input bind:value={fName} placeholder="Song / track name" required />
	<input bind:value={fGroup} list="group-list" placeholder="Group (e.g. Tavern, Combat)" />
	<datalist id="group-list">
		{#each data.folders as f (f)}<option value={f}></option>{/each}
	</datalist>
	<input bind:value={fUrl} placeholder="Link (optional if uploading)" />
	<input type="file" bind:this={fileInput} accept=".mp3,.ogg,.wav,.m4a,.flac,.webm" />
	<button type="submit" disabled={adding}>{adding ? 'Adding…' : '＋ Add song'}</button>
</form>
{#if errorMsg}<p class="err">{errorMsg}</p>{/if}

{#each data.groups as g (g.name)}
	<section class="group">
		<h2>{g.name || 'Ungrouped'}</h2>
		<ul>
			{#each g.songs as s (s.id)}
				<li class:now={playing?.id === s.id}>
					{#if s.file}
						<button class="play" onclick={() => play(s)} title="Play here">
							{playing?.id === s.id ? '♪' : '▶'}
						</button>
					{:else if s.url}
						<a class="play link" href={s.url} target="_blank" rel="noreferrer" title="Open link">↗</a>
					{/if}
					<span class="sname">{s.name}</span>
					{#if s.file && s.url}
						<a class="ext" href={s.url} target="_blank" rel="noreferrer">link ↗</a>
					{/if}
					<button class="del" title="Delete" onclick={() => remove(s)}>✕</button>
				</li>
			{/each}
		</ul>
	</section>
{:else}
	<p class="empty">No music yet — add your first track above.</p>
{/each}

{#if playing}
	<div class="player">
		<span class="now-name" title={playing.name}>
			♪ {playing.name}
			{#if playing.grp}<small>({playing.grp})</small>{/if}
		</span>
		<audio bind:this={audioEl} src="/api/music/{playing.id}" controls {loop}></audio>
		<label class="loop"><input type="checkbox" bind:checked={loop} /> loop</label>
		<button class="stop" onclick={stop}>✕</button>
	</div>
{/if}

<style>
	.tip {
		color: var(--muted);
	}
	.add {
		display: flex;
		gap: 0.5rem;
		flex-wrap: wrap;
		align-items: center;
		background: var(--panel);
		border: 1px solid var(--border);
		border-radius: 8px;
		padding: 0.7rem 0.9rem;
		margin-bottom: 1.2rem;
	}
	.add input[type='text'],
	.add input:not([type]) {
		min-width: 11rem;
	}
	.err {
		color: var(--danger);
	}
	.group {
		margin-bottom: 1.1rem;
	}
	h2 {
		font-size: 1.05rem;
		color: var(--accent);
		border-bottom: 1px solid var(--border);
		padding-bottom: 0.25rem;
		margin: 0 0 0.5rem;
	}
	ul {
		list-style: none;
		margin: 0;
		padding: 0;
		display: grid;
		gap: 0.2rem;
		max-width: 640px;
	}
	li {
		display: flex;
		align-items: center;
		gap: 0.6rem;
		padding: 0.25rem 0.45rem;
		border-radius: 6px;
	}
	li:hover {
		background: var(--panel-2);
	}
	li.now {
		background: rgba(127, 191, 127, 0.08);
	}
	li.now .sname {
		color: var(--accent);
	}
	.play {
		width: 2rem;
		text-align: center;
		font-size: 0.85rem;
		padding: 0.15rem 0;
	}
	.play.link {
		text-decoration: none;
		border: 1px solid var(--border);
		border-radius: 6px;
		color: var(--text);
	}
	.play.link:hover {
		border-color: var(--accent);
	}
	.sname {
		flex: 1;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
	.ext {
		font-size: 0.8rem;
		text-decoration: none;
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
	.player {
		position: fixed;
		bottom: 0;
		left: 224px;
		right: 0;
		z-index: 30;
		display: flex;
		align-items: center;
		gap: 0.8rem;
		background: var(--panel);
		border-top: 1px solid var(--border);
		padding: 0.5rem 1.2rem;
	}
	@media (max-width: 760px) {
		.player {
			left: 0;
		}
	}
	.now-name {
		flex: 0 1 auto;
		min-width: 0;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
		color: var(--accent);
	}
	.now-name small {
		color: var(--muted);
	}
	.player audio {
		flex: 1;
		min-width: 200px;
		height: 34px;
	}
	.loop {
		display: flex;
		align-items: center;
		gap: 0.3rem;
		color: var(--muted);
		font-size: 0.85rem;
		white-space: nowrap;
	}
	.stop {
		background: transparent;
		border: none;
		color: var(--muted);
	}
	.stop:hover {
		color: var(--danger);
	}
</style>
