<script lang="ts">
	import Token from '$lib/components/Token.svelte';
	import { cultures, generateName, generateTavern } from '$lib/names';
	import { DM_SCREEN } from '$lib/dmscreen';
	import { invalidateAll } from '$app/navigation';
	import { confirmDialog } from '$lib/confirm.svelte';

	let { data } = $props();

	// A different whisper each visit to the sanctum.
	const FLAVOR = [
		'The Weave hums, awaiting your command.',
		'Somewhere out there, a party approaches your dungeon.',
		'Ink, dice, and a little arcana.',
		'The table is set. The tale is yours.',
		'Every empty page is an unrolled map.'
	];
	const flavorLine = FLAVOR[Math.floor(Math.random() * FLAVOR.length)];

	let screenTab = $state(DM_SCREEN[0].key);
	const screenSection = $derived(DM_SCREEN.find((s) => s.key === screenTab) ?? DM_SCREEN[0]);

	// --- Party management ---
	let addingPc = $state(false);
	let pcName = $state('');
	let pcClass = $state('');
	let pcFileInput: HTMLInputElement | undefined = $state();
	let pcError = $state('');

	async function addPc(e: SubmitEvent) {
		e.preventDefault();
		pcError = '';
		const form = new FormData();
		form.set('name', pcName);
		form.set('class', pcClass);
		const file = pcFileInput?.files?.[0];
		if (file) form.set('file', file);
		const res = await fetch('/api/pcs', { method: 'POST', body: form });
		const body = await res.json();
		if (!res.ok) {
			pcError = body.error ?? 'Failed to add character.';
			return;
		}
		pcName = '';
		pcClass = '';
		if (pcFileInput) pcFileInput.value = '';
		addingPc = false;
		invalidateAll();
	}

	async function removePc(id: number, name: string) {
		const ok = await confirmDialog({
			title: 'Remove character?',
			message: `${name} will be removed from the party.`,
			confirmLabel: 'Remove',
			danger: true
		});
		if (!ok) return;
		await fetch(`/api/pcs/${id}`, { method: 'DELETE' });
		invalidateAll();
	}

	// Stat-sheet linking per PC — clicking their token in a battle opens it.
	let linkingPcId = $state<number | null>(null);
	let pcSheetQuery = $state('');
	let pcSheetResults = $state<any[]>([]);
	let pcSheetTimer: ReturnType<typeof setTimeout>;
	function startLinking(id: number) {
		linkingPcId = linkingPcId === id ? null : id;
		pcSheetQuery = '';
		pcSheetResults = [];
	}
	function onPcSheetQuery() {
		clearTimeout(pcSheetTimer);
		pcSheetTimer = setTimeout(async () => {
			const q = pcSheetQuery.trim();
			if (!q) {
				pcSheetResults = [];
				return;
			}
			const res = await fetch(`/api/monsters/search?q=${encodeURIComponent(q)}`);
			pcSheetResults = (await res.json()).results;
		}, 200);
	}
	async function setPcSheet(id: number, slug: string) {
		await fetch(`/api/pcs/${id}`, {
			method: 'PATCH',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ sheet_slug: slug })
		});
		linkingPcId = null;
		pcSheetQuery = '';
		pcSheetResults = [];
		invalidateAll();
	}

	let sparkCulture = $state('Human');
	let sparks = $state<string[]>([
		generateName('Human'),
		generateName('Elf'),
		generateName('Dwarf'),
		generateTavern()
	]);
	function reroll() {
		sparks = [
			generateName(sparkCulture),
			generateName(sparkCulture),
			generateName(sparkCulture),
			generateTavern()
		];
	}

	let roll = $state<number | null>(null);
	let rolling = $state(false);
	let rollTimer: ReturnType<typeof setInterval>;
	function rollD20() {
		if (rolling) return;
		rolling = true;
		let ticks = 0;
		rollTimer = setInterval(() => {
			roll = 1 + Math.floor(Math.random() * 20);
			if (++ticks >= 10) {
				clearInterval(rollTimer);
				rolling = false;
			}
		}, 65);
	}

	// The rest of the dice bag — roll qty × die, animated like the d20.
	const DICE = [4, 6, 8, 10, 12, 100];
	let qty = $state(1);
	let diceResult = $state<{ label: string; total: number; rolls: number[] } | null>(null);
	let diceRolling = $state(false);
	let diceTimer: ReturnType<typeof setInterval>;
	function rollDice(sides: number) {
		if (diceRolling) return;
		diceRolling = true;
		const n = Math.min(20, Math.max(1, Math.round(qty) || 1));
		qty = n;
		let ticks = 0;
		diceTimer = setInterval(() => {
			const rolls = Array.from({ length: n }, () => 1 + Math.floor(Math.random() * sides));
			diceResult = {
				label: `${n}d${sides}`,
				total: rolls.reduce((a, b) => a + b, 0),
				rolls
			};
			if (++ticks >= 8) {
				clearInterval(diceTimer);
				diceRolling = false;
			}
		}, 70);
	}
</script>

<svelte:head><title>NilBot Tabletop</title></svelte:head>

<div class="top">
	<div>
		<h1>Well met, {data.dmName}</h1>
		<p class="tagline">{flavorLine}</p>
	</div>
	<form method="POST" action="/notes?/create">
		<button class="primary" type="submit">＋ New session</button>
	</form>
</div>

<div class="grid">
	<div class="main-col">
	{#if data.lastSession}
		<a class="panel continue" href="/notes/{data.lastSession.id}">
			<p class="panel-label">Jump back in</p>
			<h2>{data.lastSession.title}</h2>
			<p class="preview">{data.lastSession.preview || 'Empty session — start writing.'}</p>
			<small>last edited {data.lastSession.updated_at}</small>
		</a>
	{:else}
		<div class="panel continue">
			<p class="panel-label">Getting started</p>
			<h2>No sessions yet</h2>
			<p class="preview">
				Create your first session, write your prep like you would anywhere — then let the
				Battle Extractor build the encounters for you.
			</p>
		</div>
	{/if}

	<div class="panel dm-screen">
		<p class="panel-label">⛨ DM Screen</p>
		<div class="screen-tabs">
			{#each DM_SCREEN as s (s.key)}
				<button class:on={screenTab === s.key} onclick={() => (screenTab = s.key)}>{s.label}</button>
			{/each}
		</div>
		{#each screenSection.groups as g, gi (gi)}
			{#if g.title}<h4 class="screen-group">{g.title}</h4>{/if}
			<div class="screen-cols">
				{#each g.entries as e (e.t)}
					<p class="rule"><b>{e.t}.</b> {e.d}</p>
				{/each}
			</div>
		{/each}
	</div>
	</div>

	<div class="side-col">
	<div class="panel dice-panel">
		<p class="panel-label">D20</p>
		<button
			class="die"
			class:rolling
			class:nat20={!rolling && roll === 20}
			class:nat1={!rolling && roll === 1}
			onclick={rollD20}
			title="Roll a d20"
		>
			<svg viewBox="0 0 64 64" aria-hidden="true">
				<polygon points="32,4 56,17 56,47 32,60 8,47 8,17" fill="none" stroke="currentColor" stroke-width="3" stroke-linejoin="round" />
				<polygon points="32,15 46,39 18,39" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round" />
			</svg>
			<span class="die-num">{roll ?? '?'}</span>
		</button>
		<p class="die-caption">
			{#if rolling}
				rolling…
			{:else if roll === 20}
				Natural 20!
			{:else if roll === 1}
				Natural 1. Ouch.
			{:else if roll !== null}
				You rolled {roll}
			{:else}
				Click the die
			{/if}
		</p>
		<div class="dice-bag">
			<div class="qty">
				<button onclick={() => (qty = Math.max(1, qty - 1))} title="Fewer dice">−</button>
				<input type="number" min="1" max="20" bind:value={qty} />
				<button onclick={() => (qty = Math.min(20, qty + 1))} title="More dice">＋</button>
			</div>
			<div class="dice-row">
				{#each DICE as d (d)}
					<button class="die-btn" onclick={() => rollDice(d)} disabled={diceRolling}>d{d}</button>
				{/each}
			</div>
			{#if diceResult}
				<p class="dice-out" class:spin={diceRolling}>
					{diceResult.label} → <b>{diceResult.total}</b>
					{#if diceResult.rolls.length > 1}
						<span class="breakdown">({diceResult.rolls.join(' + ')})</span>
					{/if}
				</p>
			{/if}
		</div>
	</div>

	<div class="panel">
		<p class="panel-label">Your party</p>
		{#if data.pcs.length === 0 && !addingPc}
			<p class="empty">No characters yet — add your players so their tokens appear on battle maps.</p>
		{/if}
		<div class="party-grid">
			{#each data.pcs as pc (pc.id)}
				<div class="pc">
					{#if pc.img}
						<img class="pc-img" src={pc.img} alt={pc.name} />
					{:else}
						<Token name={pc.name} type={null} px={52} />
					{/if}
					<b>{pc.name}</b>
					{#if pc.class}<small>{pc.class}</small>{/if}
					{#if pc.sheetSlug}
						<button
							class="pc-sheet on"
							title="Linked sheet: {pc.sheetName ?? pc.sheetSlug} — click to unlink"
							onclick={() => setPcSheet(pc.id, '')}>📜 {pc.sheetName ?? 'sheet'}</button
						>
					{:else}
						<button
							class="pc-sheet"
							title="Link a stat sheet — clicking their token in a battle opens it"
							onclick={() => startLinking(pc.id)}>＋📜</button
						>
					{/if}
					<button class="pc-del" title="Remove" onclick={() => removePc(pc.id, pc.name)}>✕</button>
				</div>
			{/each}
		</div>
		{#if linkingPcId !== null}
			<div class="pc-sheet-search">
				<input
					bind:value={pcSheetQuery}
					oninput={onPcSheetQuery}
					placeholder="Search bestiary for {data.pcs.find((p: any) => p.id === linkingPcId)?.name}…"
				/>
				{#if pcSheetResults.length}
					<ul class="pc-sheet-results">
						{#each pcSheetResults as r (r.slug)}
							<li>
								<button onclick={() => setPcSheet(linkingPcId!, r.slug)}>
									{#if r.img}<img src={r.img} alt="" />{/if}
									<span>{r.name}</span>
									<small>CR {r.cr_text ?? '—'}</small>
								</button>
							</li>
						{/each}
					</ul>
				{/if}
			</div>
		{/if}
		{#if addingPc}
			<form class="pc-form" onsubmit={addPc}>
				<input bind:value={pcName} placeholder="Character name" required />
				<input bind:value={pcClass} placeholder="Class (optional)" />
				<input type="file" bind:this={pcFileInput} accept=".png,.jpg,.jpeg,.webp,.gif" />
				{#if pcError}<p class="err">{pcError}</p>{/if}
				<div class="pc-form-row">
					<button type="submit">Add</button>
					<button type="button" onclick={() => (addingPc = false)}>Cancel</button>
				</div>
			</form>
		{:else}
			<button class="more-btn" onclick={() => (addingPc = true)}>＋ Add character</button>
		{/if}
	</div>

	{#if data.spotlight}
		<a class="panel spotlight" href="/bestiary/{encodeURIComponent(data.spotlight.slug)}">
			<p class="panel-label">Monster of the day</p>
			<div class="spot-row">
				<Token
					name={data.spotlight.name}
					type={data.spotlight.type}
					px={72}
					img={data.spotlight.img}
				/>
				<div>
					<h2>{data.spotlight.name}</h2>
					<p class="muted">
						CR {data.spotlight.cr_text ?? '?'} · {data.spotlight.size ?? ''}
						{data.spotlight.type ?? ''}
					</p>
					<p class="muted src">{data.spotlight.source}</p>
				</div>
			</div>
		</a>
	{/if}

	<div class="panel">
		<p class="panel-label">Name sparks</p>
		<div class="spark-controls">
			<select bind:value={sparkCulture} onchange={reroll}>
				{#each cultures as c (c)}
					<option value={c}>{c}</option>
				{/each}
			</select>
			<button onclick={reroll}>↻ Reroll</button>
		</div>
		<ul class="sparks">
			{#each sparks as s, i (i)}
				<li class:tavern={i === 3}>{s}{i === 3 ? ' (tavern)' : ''}</li>
			{/each}
		</ul>
		<a class="more" href="/names">full generator →</a>
	</div>
	</div>
</div>

<div class="stats">
	<a href="/notes"><b>{data.counts.notes}</b> sessions</a>
	<a href="/battles"><b>{data.counts.battles}</b> battles</a>
	<a href="/maps"><b>{data.counts.maps}</b> maps</a>
	<a href="/bestiary"><b>{data.counts.monsters.toLocaleString()}</b> monsters</a>
	<span><b>{data.counts.tokens}</b> with token art</span>
</div>

<style>
	.top {
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: 1rem;
		flex-wrap: wrap;
	}
	h1 {
		margin-bottom: 0.1rem;
	}
	.tagline {
		color: var(--muted);
		font-style: italic;
		margin: 0;
	}
	.primary {
		background: var(--accent-2);
		border-color: var(--accent-2);
		font-weight: 600;
	}

	/* Deliberate two-column layout: the work happens in the main column
	   (session + DM screen), utilities stack in a rail — no orphan slots. */
	.grid {
		display: grid;
		grid-template-columns: minmax(0, 2.2fr) minmax(280px, 1fr);
		gap: 1rem;
		margin: 1.5rem 0;
		align-items: stretch;
	}
	@media (max-width: 900px) {
		.grid {
			grid-template-columns: 1fr;
		}
	}
	.main-col,
	.side-col {
		display: flex;
		flex-direction: column;
		gap: 1rem;
		min-width: 0;
	}
	.dm-screen {
		flex: 1;
	}
	.screen-tabs {
		display: flex;
		flex-wrap: wrap;
		gap: 0.35rem;
		margin-bottom: 0.9rem;
	}
	.screen-tabs button {
		font-size: 0.85rem;
		padding: 0.25rem 0.75rem;
		border-radius: 99px;
		background: transparent;
		color: var(--muted);
	}
	.screen-tabs button:hover {
		color: var(--text);
		border-color: var(--accent);
	}
	.screen-tabs button.on {
		color: var(--accent);
		border-color: var(--accent);
		background: rgba(127, 191, 127, 0.08);
	}
	.screen-group {
		margin: 0.9rem 0 0.4rem;
		font-family: var(--serif);
		color: var(--accent);
		font-size: 0.98rem;
	}
	.screen-cols {
		columns: 2 280px;
		column-gap: 1.6rem;
	}
	.rule {
		margin: 0 0 0.55rem;
		font-size: 0.88rem;
		line-height: 1.5;
		color: var(--muted);
		break-inside: avoid;
	}
	.rule b {
		color: var(--text);
	}
	.panel {
		background: var(--panel);
		border: 1px solid var(--border);
		border-radius: 10px;
		padding: 1rem 1.2rem;
		display: block;
		color: var(--text);
		text-decoration: none;
	}
	a.panel {
		transition: border-color 0.15s ease, transform 0.15s ease;
	}
	a.panel:hover {
		border-color: var(--accent);
		transform: translateY(-2px);
	}
	.panel-label {
		text-transform: uppercase;
		font-size: 0.72rem;
		letter-spacing: 0.09em;
		color: var(--muted);
		margin: 0 0 0.4rem;
	}
	.panel h2 {
		margin: 0 0 0.3rem;
		color: var(--accent);
		font-size: 1.25rem;
	}
	.preview {
		color: var(--muted);
		font-size: 0.92rem;
		margin: 0 0 0.4rem;
		display: -webkit-box;
		-webkit-line-clamp: 3;
		-webkit-box-orient: vertical;
		overflow: hidden;
	}
	small,
	.muted {
		color: var(--muted);
	}
	.empty {
		color: var(--muted);
		font-size: 0.92rem;
	}

	.dice-panel {
		display: flex;
		flex-direction: column;
		align-items: center;
		text-align: center;
	}
	.dice-panel .panel-label {
		align-self: flex-start;
	}
	.die {
		position: relative;
		background: transparent;
		border: none;
		color: var(--accent);
		width: 120px;
		height: 120px;
		padding: 0;
		transition: transform 0.15s ease, color 0.2s ease;
	}
	.die:hover {
		transform: scale(1.06);
		border: none;
	}
	.die svg {
		width: 100%;
		height: 100%;
	}
	.die.rolling {
		animation: shake 0.13s infinite;
	}
	.die.nat20 {
		color: #d4a24e;
		filter: drop-shadow(0 0 10px rgba(212, 162, 78, 0.65));
	}
	.die.nat1 {
		color: var(--danger);
		filter: drop-shadow(0 0 10px rgba(224, 108, 91, 0.5));
	}
	.die-num {
		position: absolute;
		inset: 0;
		display: flex;
		align-items: center;
		justify-content: center;
		font-family: var(--serif);
		font-size: 2rem;
		font-weight: 700;
	}
	.die-caption {
		color: var(--muted);
		font-style: italic;
		margin: 0.4rem 0 0;
		font-size: 0.9rem;
	}
	.dice-bag {
		border-top: 1px solid var(--border);
		margin-top: 0.7rem;
		padding-top: 0.7rem;
		display: grid;
		gap: 0.5rem;
		justify-items: center;
	}
	.qty {
		display: flex;
		align-items: center;
		gap: 0.3rem;
	}
	.qty input {
		width: 2.8rem;
		text-align: center;
		font-size: 0.9rem;
		padding: 0.2rem 0.1rem;
	}
	.qty button {
		padding: 0.15rem 0.55rem;
		font-size: 0.9rem;
	}
	.dice-row {
		display: flex;
		flex-wrap: wrap;
		justify-content: center;
		gap: 0.35rem;
	}
	.die-btn {
		font-size: 0.85rem;
		padding: 0.25rem 0.55rem;
		font-family: var(--serif);
	}
	.die-btn:hover {
		border-color: var(--accent);
		color: var(--accent);
	}
	.dice-out {
		margin: 0;
		font-size: 0.92rem;
		color: var(--text);
		text-align: center;
	}
	.dice-out.spin {
		opacity: 0.6;
	}
	.dice-out b {
		color: var(--accent);
		font-size: 1.05rem;
	}
	.breakdown {
		color: var(--muted);
		font-size: 0.8rem;
	}
	@keyframes shake {
		0% { transform: rotate(-4deg); }
		50% { transform: rotate(4deg); }
		100% { transform: rotate(-4deg); }
	}

	.party-grid {
		display: flex;
		flex-wrap: wrap;
		gap: 0.9rem;
		margin-bottom: 0.6rem;
	}
	.pc {
		position: relative;
		display: grid;
		justify-items: center;
		gap: 0.1rem;
		width: 84px;
		text-align: center;
	}
	.pc-img {
		width: 52px;
		height: 52px;
		border-radius: 50%;
		object-fit: cover;
		border: 2px solid #3d6b9e;
	}
	.pc b {
		font-size: 0.85rem;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
		max-width: 84px;
	}
	.pc small {
		color: var(--muted);
		font-size: 0.72rem;
	}
	.pc-del {
		position: absolute;
		top: -6px;
		right: 2px;
		background: transparent;
		border: none;
		color: var(--muted);
		font-size: 0.75rem;
		padding: 0.1rem;
		opacity: 0;
	}
	.pc:hover .pc-del {
		opacity: 1;
	}
	.pc-sheet {
		background: transparent;
		border: 1px solid var(--border);
		border-radius: 99px;
		color: var(--muted);
		font-size: 0.7rem;
		padding: 0.1rem 0.5rem;
		max-width: 100%;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
	.pc-sheet:hover {
		border-color: var(--accent);
		color: var(--text);
	}
	.pc-sheet.on {
		color: var(--accent);
		border-color: var(--accent);
	}
	.pc-sheet-search {
		margin-top: 0.5rem;
		display: grid;
		gap: 0.3rem;
	}
	.pc-sheet-results {
		list-style: none;
		margin: 0;
		padding: 0;
		border: 1px solid var(--border);
		border-radius: 6px;
		max-height: 200px;
		overflow-y: auto;
	}
	.pc-sheet-results li + li {
		border-top: 1px solid var(--border);
	}
	.pc-sheet-results button {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		width: 100%;
		background: transparent;
		border: none;
		border-radius: 0;
		padding: 0.35rem 0.6rem;
		text-align: left;
	}
	.pc-sheet-results button:hover {
		background: var(--panel-2);
	}
	.pc-sheet-results img {
		width: 24px;
		height: 24px;
		border-radius: 50%;
		object-fit: cover;
	}
	.pc-sheet-results small {
		margin-left: auto;
		color: var(--muted);
	}
	.pc-del:hover {
		color: var(--danger);
	}
	.pc-form {
		display: grid;
		gap: 0.45rem;
	}
	.pc-form-row {
		display: flex;
		gap: 0.5rem;
	}
	.err {
		color: var(--danger);
		font-size: 0.85rem;
		margin: 0;
	}
	.more-btn {
		font-size: 0.85rem;
		padding: 0.3rem 0.7rem;
	}
	.spot-row {
		display: flex;
		align-items: center;
		gap: 1rem;
	}
	.spot-row h2 {
		margin: 0;
	}
	.spot-row p {
		margin: 0.1rem 0;
	}
	.src {
		font-size: 0.8rem;
	}

	.spark-controls {
		display: flex;
		gap: 0.5rem;
		margin-bottom: 0.5rem;
	}
	.sparks {
		list-style: none;
		margin: 0 0 0.4rem;
		padding: 0;
		line-height: 1.9;
		font-family: var(--serif);
		font-size: 1.05rem;
	}
	.sparks .tavern {
		color: var(--muted);
		font-style: italic;
	}
	.more {
		font-size: 0.85rem;
		text-decoration: none;
	}

	.stats {
		display: flex;
		gap: 1.5rem;
		flex-wrap: wrap;
		border-top: 1px solid var(--border);
		padding-top: 0.9rem;
		color: var(--muted);
		font-size: 0.9rem;
	}
	.stats a {
		color: var(--muted);
		text-decoration: none;
	}
	.stats a:hover {
		color: var(--text);
	}
	.stats b {
		color: var(--accent);
		font-weight: 700;
	}
</style>
