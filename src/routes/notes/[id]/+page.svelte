<script lang="ts">
	import { marked } from 'marked';
	import { browser } from '$app/environment';

	let { data } = $props();

	// The extractor panel can fold away to give the text the full width.
	let panelHidden = $state(browser && localStorage.getItem('nb-extractor') === '1');
	function togglePanel() {
		panelHidden = !panelHidden;
		localStorage.setItem('nb-extractor', panelHidden ? '1' : '0');
	}

	let title = $state(data.note.title);
	let content = $state(data.note.content);
	let saveState = $state<'saved' | 'saving' | 'error'>('saved');
	let showPreview = $state(false);
	let tab = $state<'session' | 'quick'>('session');

	// --- Quick notes ---
	let quickNotes = $state([...data.quickNotes]);
	let quickDraft = $state('');
	let quickBusy = $state(false);

	async function addQuick() {
		const content = quickDraft.trim();
		if (!content || quickBusy) return;
		quickBusy = true;
		try {
			const res = await fetch(`/api/notes/${data.note.id}/quick`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ content })
			});
			const body = await res.json();
			if (res.ok) {
				quickNotes = [
					{ id: body.id, content, created_at: new Date().toISOString().slice(0, 16).replace('T', ' ') },
					...quickNotes
				];
				quickDraft = '';
			}
		} finally {
			quickBusy = false;
		}
	}
	async function removeQuick(id: number) {
		quickNotes = quickNotes.filter((q) => q.id !== id);
		await fetch(`/api/notes/${data.note.id}/quick`, {
			method: 'DELETE',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ quickId: id })
		});
	}

	let partyLevel = $state(data.partyDefaults.level);
	let partySize = $state(data.partyDefaults.size);

	// Manual battle creation for instances without the claude CLI.
	let creatingByHand = $state(false);
	async function createByHand() {
		if (creatingByHand) return;
		creatingByHand = true;
		try {
			const res = await fetch('/api/battles', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					noteId: data.note.id,
					encounter: {
						title: `${title || 'Session'} — battle`,
						creatures: [],
						partyLevel,
						partySize
					}
				})
			});
			const body = await res.json();
			if (res.ok) window.location.href = `/battles/${data.note.id}/${body.id}`;
		} finally {
			creatingByHand = false;
		}
	}
	let suggesting = $state(false);
	let suggestError = $state('');
	let encounters = $state<any[]>([]);
	let savedBattles = $state<Record<number, 'saving' | 'saved'>>({});

	let saveTimer: ReturnType<typeof setTimeout>;
	function scheduleSave() {
		saveState = 'saving';
		clearTimeout(saveTimer);
		saveTimer = setTimeout(save, 1200);
	}
	async function save() {
		try {
			const res = await fetch(`/api/notes/${data.note.id}`, {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ title, content })
			});
			saveState = res.ok ? 'saved' : 'error';
		} catch {
			saveState = 'error';
		}
	}

	async function saveBattle(enc: any, index: number) {
		if (savedBattles[index]) return;
		savedBattles[index] = 'saving';
		try {
			const res = await fetch('/api/battles', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ noteId: data.note.id, encounter: enc })
			});
			if (res.ok) savedBattles[index] = 'saved';
			else delete savedBattles[index];
		} catch {
			delete savedBattles[index];
		}
	}

	async function suggest() {
		suggesting = true;
		suggestError = '';
		encounters = [];
		savedBattles = {};
		try {
			const res = await fetch('/api/encounter', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ text: content, partyLevel, partySize })
			});
			const body = await res.json();
			if (!res.ok) suggestError = body.error ?? 'Something went wrong.';
			else if (body.encounters.length === 0)
				suggestError = 'No combat encounters found in these notes.';
			else encounters = body.encounters;
		} catch {
			suggestError = 'Request failed.';
		} finally {
			suggesting = false;
		}
	}
</script>

<svelte:head><title>{title || 'Session'} · NilBot</title></svelte:head>

<p><a href="/notes">← All sessions</a></p>

<div class="editor-head">
	<input class="title" bind:value={title} oninput={scheduleSave} placeholder="Session title" />
	<span class="status" class:error={saveState === 'error'}>
		{saveState === 'saved' ? '✓ saved' : saveState === 'saving' ? 'saving…' : 'save failed'}
	</span>
	{#if tab === 'session'}
		<button onclick={() => (showPreview = !showPreview)}>
			{showPreview ? 'Edit' : 'Preview'}
		</button>
		<button onclick={togglePanel} title="Show/hide the Battle Extractor panel">
			{panelHidden ? '⚔ Extractor' : '⚔ ✕'}
		</button>
	{/if}
</div>

<div class="tabs">
	<button class:on={tab === 'session'} onclick={() => (tab = 'session')}>Session</button>
	<button class:on={tab === 'quick'} onclick={() => (tab = 'quick')}>
		Quick notes {quickNotes.length ? `(${quickNotes.length})` : ''}
	</button>
</div>

{#if tab === 'quick'}
	<div class="quick">
		<div class="quick-add">
			<input
				bind:value={quickDraft}
				placeholder="Jot something before you forget — Enter to add"
				onkeydown={(e) => e.key === 'Enter' && addQuick()}
			/>
			<button onclick={addQuick} disabled={quickBusy}>＋ Add</button>
		</div>
		{#if quickNotes.length === 0}
			<p class="quick-empty">Nothing jotted yet.</p>
		{/if}
		<ul class="quick-list">
			{#each quickNotes as q (q.id)}
				<li>
					<span class="q-content">{q.content}</span>
					<small>{q.created_at}</small>
					<button class="q-del" title="Delete" onclick={() => removeQuick(q.id)}>✕</button>
				</li>
			{/each}
		</ul>
	</div>
{/if}

<div class="workspace" class:hidden={tab !== 'session'} class:solo={panelHidden}>
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
				placeholder="Write your session here… mention enemies, ambushes, lairs — then hit Suggest Encounters."
			></textarea>
		{/if}
	</div>

	<aside class="panel">
		<h3>Battle Extractor</h3>
		<div class="party">
			<label>Party level <input type="number" min="1" max="20" bind:value={partyLevel} /></label>
			<label>Party size <input type="number" min="1" max="10" bind:value={partySize} /></label>
		</div>
		<button class="suggest" onclick={suggest} disabled={suggesting}>
			{suggesting ? 'Reading your notes…' : '⚔ Extract battles'}
		</button>
		<p class="byhand-note">
			No AI set up? <button class="byhand" onclick={createByHand} disabled={creatingByHand}>
				＋ build a battle by hand</button
			> — it starts empty and you add creatures on the map.
		</p>

		{#if suggestError}<p class="err">{suggestError}</p>{/if}
		{#if encounters.length}
			<p class="hint">Click a battle to save it to the Battles tab.</p>
		{/if}

		{#each encounters as enc, i (enc.title)}
			<div
				class="enc"
				class:saved={savedBattles[i] === 'saved'}
				role="button"
				tabindex="0"
				onclick={(e) => {
					if ((e.target as HTMLElement).closest('a')) return;
					saveBattle(enc, i);
				}}
				onkeydown={(e) => e.key === 'Enter' && saveBattle(enc, i)}
			>
				<div class="enc-head">
					<b>{enc.title}</b>
					<span class="badge {enc.difficulty}">{enc.difficulty}</span>
					{#if savedBattles[i] === 'saved'}
						<span class="saved-tag">✓ saved</span>
					{:else if savedBattles[i] === 'saving'}
						<span class="saved-tag">…</span>
					{/if}
				</div>
				<p class="desc">{enc.description}</p>
				<ul>
					{#each enc.creatures as c (c.requested)}
						<li>
							{c.count}×
							{#if c.matched}
								<a href="/bestiary/{encodeURIComponent(c.slug)}">{c.name}</a>
								<small>(CR {c.cr_text ?? '?'}{c.xp ? `, ${c.xp} XP` : ''})</small>
							{:else}
								{c.requested} <small class="miss">not in bestiary</small>
							{/if}
						</li>
					{/each}
				</ul>
				<p class="xp">
					{enc.totalXp.toLocaleString()} XP ({enc.adjustedXp.toLocaleString()} adjusted) ·
					deadly at {enc.thresholds.deadly.toLocaleString()}
				</p>
			</div>
		{/each}
	</aside>
</div>

<style>
	.tabs {
		display: flex;
		gap: 0.35rem;
		margin-bottom: 0.75rem;
	}
	.tabs button {
		border-radius: 99px;
		padding: 0.2rem 0.85rem;
		font-size: 0.88rem;
		color: var(--muted);
	}
	.tabs button.on {
		color: var(--accent);
		border-color: var(--accent);
		background: rgba(127, 191, 127, 0.08);
	}
	.workspace.hidden {
		display: none;
	}
	.quick {
		max-width: 720px;
	}
	.quick-add {
		display: flex;
		gap: 0.5rem;
		margin-bottom: 0.8rem;
	}
	.quick-add input {
		flex: 1;
	}
	.quick-empty {
		color: var(--muted);
	}
	.quick-list {
		list-style: none;
		margin: 0;
		padding: 0;
		display: grid;
		gap: 0.35rem;
	}
	.quick-list li {
		display: flex;
		align-items: baseline;
		gap: 0.7rem;
		background: var(--panel);
		border: 1px solid var(--border);
		border-left: 3px solid var(--accent-2);
		border-radius: 8px;
		padding: 0.5rem 0.8rem;
	}
	.q-content {
		flex: 1;
		white-space: pre-wrap;
	}
	.quick-list small {
		color: var(--muted);
		white-space: nowrap;
		font-size: 0.75rem;
	}
	.q-del {
		background: transparent;
		border: none;
		color: var(--muted);
		padding: 0 0.15rem;
	}
	.q-del:hover {
		color: var(--danger);
	}
	.editor-head {
		display: flex;
		gap: 0.75rem;
		align-items: center;
		margin-bottom: 0.75rem;
	}
	.title {
		flex: 1;
		font-size: 1.2rem;
		font-weight: 600;
	}
	.status {
		color: var(--muted);
		font-size: 0.85rem;
		white-space: nowrap;
	}
	.status.error {
		color: #e06c5b;
	}
	.workspace {
		display: grid;
		grid-template-columns: 1fr 340px;
		gap: 1rem;
		align-items: start;
	}
	.workspace.solo {
		grid-template-columns: 1fr;
	}
	.byhand-note {
		color: var(--muted);
		font-size: 0.82rem;
		margin: 0.5rem 0 0;
		line-height: 1.5;
	}
	.byhand {
		background: transparent;
		border: none;
		color: var(--accent);
		padding: 0;
		font-size: 0.82rem;
		text-decoration: underline;
	}
	.workspace.solo .panel {
		display: none;
	}
	@media (max-width: 900px) {
		.workspace {
			grid-template-columns: 1fr;
		}
	}
	textarea {
		width: 100%;
		min-height: 65vh;
		resize: vertical;
		font-family: ui-monospace, 'Cascadia Code', monospace;
		font-size: 0.95rem;
		line-height: 1.6;
		box-sizing: border-box;
	}
	.preview {
		background: var(--panel);
		border: 1px solid var(--border);
		border-radius: 8px;
		padding: 1rem 1.25rem;
		min-height: 65vh;
	}
	.panel {
		background: var(--panel);
		border: 1px solid var(--border);
		border-radius: 8px;
		padding: 1rem;
		position: sticky;
		top: 1rem;
	}
	.panel h3 {
		margin-top: 0;
		color: var(--accent);
	}
	.party {
		display: flex;
		gap: 0.75rem;
		margin-bottom: 0.75rem;
	}
	.party label {
		font-size: 0.85rem;
		color: var(--muted);
		display: grid;
		gap: 0.2rem;
	}
	.party input {
		width: 4.5rem;
	}
	.suggest {
		width: 100%;
		background: var(--accent-2);
		border-color: var(--accent-2);
		font-weight: 600;
	}
	.err {
		color: #e06c5b;
		font-size: 0.9rem;
	}
	.hint {
		color: var(--muted);
		font-size: 0.82rem;
		margin: 0.5rem 0 0;
	}
	.enc {
		border: 1px solid var(--border);
		border-radius: 8px;
		margin-top: 0.75rem;
		padding: 0.6rem 0.75rem;
		cursor: pointer;
	}
	.enc:hover {
		border-color: var(--accent);
	}
	.enc.saved {
		border-color: #7fbf7f;
		cursor: default;
	}
	.saved-tag {
		color: #7fbf7f;
		font-size: 0.8rem;
		white-space: nowrap;
	}
	.enc-head {
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: 0.5rem;
	}
	.badge {
		font-size: 0.72rem;
		text-transform: uppercase;
		padding: 0.1rem 0.45rem;
		border-radius: 99px;
		border: 1px solid var(--border);
		color: var(--muted);
	}
	.badge.easy { color: #7fbf7f; border-color: #7fbf7f; }
	.badge.medium { color: #d4a24e; border-color: #d4a24e; }
	.badge.hard { color: #e0955b; border-color: #e0955b; }
	.badge.deadly { color: #e06c5b; border-color: #e06c5b; }
	.desc {
		color: var(--muted);
		font-size: 0.88rem;
		margin: 0.25rem 0;
	}
	.enc ul {
		margin: 0.25rem 0;
		padding-left: 1.1rem;
	}
	.miss {
		color: #e06c5b;
	}
	.xp {
		font-size: 0.82rem;
		color: var(--muted);
		margin: 0.35rem 0 0;
	}
</style>
