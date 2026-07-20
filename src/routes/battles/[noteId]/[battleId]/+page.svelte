<script lang="ts">
	import { tokenColor, tokenInitials, tokenCells } from '$lib/token';
	import { TAGS, envToTag } from '$lib/tags';
	import StatBlock from '$lib/components/StatBlock.svelte';
	import { confirmDialog } from '$lib/confirm.svelte';

	let { data } = $props();

	// --- Map picker filtering ---
	let pickerTag = $state(envToTag(data.environment) ?? '');
	const filteredMaps = $derived(
		pickerTag
			? data.maps.filter((m: any) => `,${m.tags},`.includes(`,${pickerTag},`))
			: data.maps
	);

	// --- Bestiary search → add token to the board (right drawer) ---
	let adding = $state(false);
	let editMode = $state(false);

	function removeToken(id: string) {
		layout.tokens = layout.tokens.filter((tk: any) => tk.id !== id);
		if (layout.encounter?.activeId === id) layout.encounter.activeId = null;
		persist();
	}
	let search = $state('');
	let results = $state<any[]>([]);
	let searching = $state(false);
	let lastAdded = $state('');
	let searchTimer: ReturnType<typeof setTimeout>;
	let addedTimer: ReturnType<typeof setTimeout>;

	function focusOnMount(el: HTMLElement) {
		el.focus();
	}
	function openAdd() {
		sheet = null;
		adding = true;
	}
	function closeAdd() {
		adding = false;
		search = '';
		results = [];
		lastAdded = '';
	}

	function onSearchInput() {
		clearTimeout(searchTimer);
		if (!search.trim()) {
			results = [];
			return;
		}
		searchTimer = setTimeout(async () => {
			searching = true;
			try {
				const res = await fetch(`/api/monsters/search?q=${encodeURIComponent(search)}`);
				if (res.ok) results = (await res.json()).results;
			} finally {
				searching = false;
			}
		}, 250);
	}

	function addCreature(m: any) {
		if (!layout) return;
		const siblings = layout.tokens.filter((t: any) => t.slug === m.slug);
		// Number duplicates: when a second copy arrives, retro-label the first "1".
		if (siblings.length === 1 && !siblings[0].label) siblings[0].label = '1';
		const label = siblings.length > 0 ? String(siblings.length + 1) : '';
		layout.tokens.push({
			id: `m${Date.now()}${Math.floor(Math.random() * 1000)}`,
			kind: 'monster',
			label,
			name: m.name,
			slug: m.slug,
			type: m.type,
			cells: tokenCells(m.size),
			img: m.img,
			maxHp: m.hp ?? null,
			hp: m.hp ?? null,
			initMod: m.initMod ?? 0,
			init: null,
			dead: false,
			x: 0.5,
			y: 0.5
		});
		lastAdded = `${m.name}${label ? ` ${label}` : ''}`;
		clearTimeout(addedTimer);
		addedTimer = setTimeout(() => (lastAdded = ''), 2500);
		persist();
	}

	// NPCs from the Characters gallery; filtered by the same search box.
	const filteredNpcs = $derived(
		search.trim()
			? data.npcs.filter((c: any) => c.name.toLowerCase().includes(search.trim().toLowerCase()))
			: data.npcs
	);

	function addNpc(c: any) {
		if (!layout) return;
		layout.tokens.push({
			id: `n${c.id}-${Date.now()}`,
			kind: 'npc',
			charId: c.id,
			label: '',
			name: c.name,
			slug: null,
			sheetSlug: c.sheetSlug,
			type: null,
			cells: c.cells ?? 1,
			img: c.img,
			maxHp: c.maxHp ?? null,
			hp: c.maxHp ?? null,
			initMod: c.initMod ?? 0,
			init: null,
			dead: false,
			x: 0.5,
			y: 0.5
		});
		lastAdded = c.name;
		clearTimeout(addedTimer);
		addedTimer = setTimeout(() => (lastAdded = ''), 2500);
		persist();
	}

	// layout = { mapId, scale (token diameter as % of map width), tokens: [{..., x, y} fractions 0..1] }
	let layout = $state(data.layout);
	let saveState = $state<'saved' | 'saving' | 'error'>('saved');
	let boardEl: HTMLDivElement | undefined = $state();

	function spreadTokens(template: any[]) {
		// Enemies along the top edge, party along the bottom, evenly spaced.
		const monsters = template.filter((t) => t.kind === 'monster');
		const pcs = template.filter((t) => t.kind === 'pc');
		monsters.forEach((t, i) => {
			t.x = (i + 1) / (monsters.length + 1);
			t.y = 0.15;
		});
		pcs.forEach((t, i) => {
			t.x = (i + 1) / (pcs.length + 1);
			t.y = 0.88;
		});
		return [...monsters, ...pcs];
	}

	async function persist() {
		saveState = 'saving';
		try {
			const res = await fetch(`/api/battles/${data.battle.id}/map`, {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(layout)
			});
			saveState = res.ok ? 'saved' : 'error';
		} catch {
			saveState = 'error';
		}
	}

	function chooseMap(mapId: number) {
		layout = {
			mapId,
			scale: 4,
			tokens: spreadTokens(structuredClone(data.template)),
			encounter: { round: 1, activeId: null }
		};
		persist();
	}

	async function changeMap() {
		const ok = await confirmDialog({
			title: 'Change map?',
			message: 'Token positions on the current map will reset.',
			confirmLabel: 'Change map'
		});
		if (ok) layout = null;
	}

	// --- Encounter tracker (initiative, HP, turns) ---
	const combatants = $derived(
		layout
			? [...layout.tokens].sort(
					(a: any, b: any) =>
						(b.init ?? -999) - (a.init ?? -999) || a.name.localeCompare(b.name)
				)
			: []
	);

	function rollInitiative() {
		for (const t of layout.tokens) {
			// DM-controlled combatants roll automatically; players call their own.
			if ((t.kind === 'monster' || t.kind === 'npc') && !t.dead) {
				t.init = 1 + Math.floor(Math.random() * 20) + (t.initMod ?? 0);
			}
		}
		persist();
	}

	function nextTurn() {
		const order = combatants.filter((t: any) => !t.dead && t.init !== null && t.init !== undefined);
		if (order.length === 0) return;
		const i = order.findIndex((t: any) => t.id === layout.encounter?.activeId);
		layout.encounter ??= { round: 1, activeId: null };
		if (i !== -1 && (i + 1) % order.length === 0) layout.encounter.round++;
		layout.encounter.activeId = order[(i + 1) % order.length].id;
		persist();
	}

	async function resetEncounter() {
		const ok = await confirmDialog({
			title: 'Reset encounter?',
			message: 'Initiative, HP, and the round counter go back to their starting values.',
			confirmLabel: 'Reset'
		});
		if (!ok) return;
		layout.encounter = { round: 1, activeId: null };
		for (const t of layout.tokens) {
			t.init = null;
			t.hp = t.maxHp;
			t.dead = false;
		}
		persist();
	}

	// Damage entry: type what was rolled, Enter applies it (negative heals).
	let dmgDraft = $state<Record<string, string>>({});
	function applyDamage(t: any) {
		const v = Number(dmgDraft[t.id]);
		if (!v || !Number.isFinite(v)) return;
		const current = Number(t.hp ?? t.maxHp ?? 0);
		t.hp = Math.max(0, current - Math.round(v));
		if (t.maxHp) t.hp = Math.min(t.hp, Number(t.maxHp));
		t.dead = t.kind === 'monster' && t.maxHp != null && Number(t.hp) <= 0;
		dmgDraft[t.id] = '';
		persist();
	}

	function updateHp(t: any) {
		if (t.hp !== null && t.hp !== undefined) {
			t.hp = Math.max(0, Math.round(Number(t.hp) || 0));
			if (t.maxHp) t.hp = Math.min(t.hp, Number(t.maxHp));
		}
		t.dead = t.kind === 'monster' && t.maxHp != null && Number(t.hp) <= 0;
		persist();
	}

	// --- Dragging (fractional coords over the image) + click-to-open sheet ---
	let drag: {
		id: string;
		dx: number;
		dy: number;
		startX: number;
		startY: number;
		moved: boolean;
	} | null = null;

	function startDrag(e: PointerEvent, id: string) {
		if (!boardEl || !layout) return;
		const t = layout.tokens.find((t: any) => t.id === id);
		if (!t) return;
		if (editMode) {
			removeToken(id);
			return;
		}
		if (e.shiftKey) {
			// Shift+click removes the token.
			removeToken(id);
			return;
		}
		const r = boardEl.getBoundingClientRect();
		drag = {
			id,
			dx: e.clientX - (r.left + t.x * r.width),
			dy: e.clientY - (r.top + t.y * r.height),
			startX: e.clientX,
			startY: e.clientY,
			moved: false
		};
		(e.currentTarget as Element).setPointerCapture(e.pointerId);
	}
	let lastLivePersist = 0;
	function moveDrag(e: PointerEvent) {
		if (!drag || !boardEl || !layout) return;
		if (Math.hypot(e.clientX - drag.startX, e.clientY - drag.startY) > 5) drag.moved = true;
		if (!drag.moved) return;
		const t = layout.tokens.find((t: any) => t.id === drag!.id);
		if (!t) return;
		const r = boardEl.getBoundingClientRect();
		t.x = Math.max(0, Math.min(1, (e.clientX - drag.dx - r.left) / r.width));
		t.y = Math.max(0, Math.min(1, (e.clientY - drag.dy - r.top) / r.height));
		// Stream mid-drag positions (throttled) so the Battle Ready view follows live.
		const now = Date.now();
		if (now - lastLivePersist > 300) {
			lastLivePersist = now;
			fetch(`/api/battles/${data.battle.id}/map`, {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(layout)
			}).catch(() => {});
		}
	}
	function endDrag() {
		if (!drag) return;
		const wasDrag = drag.moved;
		const t = layout?.tokens.find((tk: any) => tk.id === drag!.id);
		drag = null;
		if (wasDrag) persist();
		else if (t?.kind === 'monster' && t.slug) openSheet(t.slug);
		else if (t?.sheetSlug) openSheet(t.sheetSlug);
	}

	// --- Monster sheet slide-over ---
	let sheet = $state<{ meta: any; monster: any } | null>(null);
	let sheetLoading = $state(false);

	async function openSheet(slug: string) {
		adding = false;
		sheetLoading = true;
		try {
			const res = await fetch(`/api/monster/${encodeURIComponent(slug)}`);
			if (res.ok) sheet = await res.json();
		} finally {
			sheetLoading = false;
		}
	}
	function onKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape') {
			sheet = null;
			closeAdd();
		}
	}
</script>

<svelte:head><title>{data.battle.title} — map · NilBot</title></svelte:head>

<p><a href="/battles/{data.note.id}">← {data.note.title}</a></p>

<div class="head">
	<h1>{data.battle.title}</h1>
	{#if layout}
		<span class="status" class:error={saveState === 'error'}>
			{saveState === 'saved' ? '✓ saved' : saveState === 'saving' ? 'saving…' : 'save failed'}
		</span>
		<label class="scale">
			Token size
			<input
				type="range"
				min="1.5"
				max="10"
				step="0.25"
				bind:value={layout.scale}
				onchange={persist}
			/>
		</label>
		<button onclick={openAdd}>＋ Add creature</button>
		<button class:edit-on={editMode} onclick={() => (editMode = !editMode)}>
			{editMode ? '✓ Done editing' : '✎ Edit tokens'}
		</button>
		<button onclick={changeMap}>Change map</button>
	{/if}
</div>

{#if !layout}
	<h3>Choose a battle map</h3>
	{#if data.maps.length === 0}
		<p class="empty">
			No maps in your library yet — <a href="/maps">import some in the Maps tab</a> first.
		</p>
	{:else}
		<div class="picker-filters">
			<button class="pf" class:on={pickerTag === ''} onclick={() => (pickerTag = '')}>all</button>
			{#each TAGS as t (t)}
				<button class="pf" class:on={pickerTag === t} onclick={() => (pickerTag = t)}>{t}</button>
			{/each}
		</div>
		{#if envToTag(data.environment) && pickerTag === envToTag(data.environment)}
			<p class="suggest-note">
				Showing <b>{pickerTag}</b> maps to match this battle's environment — pick another filter
				to browse everything.
			</p>
		{/if}
		{#if filteredMaps.length === 0}
			<p class="empty">No {pickerTag} maps yet — try another filter or tag some in the Maps tab.</p>
		{/if}
		<div class="picker">
			{#each filteredMaps as m (m.id)}
				<button class="map-choice" onclick={() => chooseMap(m.id)}>
					<img src="/api/maps/{m.id}" alt={m.name} loading="lazy" />
					<span>{m.name}</span>
				</button>
			{/each}
		</div>
	{/if}
{:else}
	<div class="battle-layout">
	<div class="board-col">
	<div
		class="board"
		bind:this={boardEl}
		onpointermove={moveDrag}
		onpointerup={endDrag}
	>
		<img src="/api/maps/{layout.mapId}" alt="battle map" draggable="false" />
		{#each layout.tokens as t (t.id)}
			<div
				class="tok"
				class:tok-dead={t.dead}
				class:tok-active={layout.encounter?.activeId === t.id}
				class:tok-edit={editMode}
				role="button"
				tabindex="0"
				style="
					left: {t.x * 100}%;
					top: {t.y * 100}%;
					width: {layout.scale * t.cells}%;
					background: {t.img
					? `url('${t.img}') center / cover, #0d0e11`
					: t.kind === 'pc'
						? '#3d6b9e'
						: t.kind === 'npc'
							? '#6b4d8f'
							: tokenColor(t.type)};
					border-color: {t.kind === 'pc'
					? t.img
						? 'rgba(122, 166, 210, 0.45)'
						: '#9ec7ef'
					: t.kind === 'npc'
						? t.img
							? 'rgba(169, 137, 212, 0.5)'
							: '#b99ee0'
						: t.img
							? tokenColor(t.type)
							: '#0d0e11'};
				"
				title="{t.name}{t.label ? ` ${t.label}` : ''}"
				onpointerdown={(e) => startDrag(e, t.id)}
			>
				{#if !t.img}
					<span>{t.kind === 'pc' ? t.label || tokenInitials(t.name) : t.kind === 'npc' ? tokenInitials(t.name) : tokenInitials(t.name) + t.label}</span>
				{:else if t.label}
					<span class="corner">{t.label}</span>
				{/if}
				{#if editMode}
					<span class="tok-x">✕</span>
				{/if}
			</div>
		{/each}
	</div>
	<p class="hint">
		{#if editMode}
			<b>Edit mode:</b> click any token to remove it from the battle.
		{:else}
			Drag tokens to reposition · click a monster (or anyone with a linked sheet) for the stat
			block · Shift+click removes a token · new creatures drop in at the center of the map.
		{/if}
	</p>
	</div>

	<aside class="tracker">
		<div class="tracker-head">
			<span class="round">Round {layout.encounter?.round ?? 1}</span>
			<button class="small" onclick={rollInitiative} title="Roll d20 + DEX for all monsters">🎲 Initiative</button>
			<button class="small next" onclick={nextTurn}>Next turn →</button>
		</div>
		<ul class="combatants">
			{#each combatants as t (t.id)}
				<li class:dead={t.dead} class:active={layout.encounter?.activeId === t.id}>
					<span
						class="mini"
						style="background:{t.img
							? `url('${t.img}') center / cover`
							: t.kind === 'pc'
								? '#3d6b9e'
								: t.kind === 'npc'
									? '#6b4d8f'
									: tokenColor(t.type)}"
					></span>
					<span class="cname" title={t.name}>{t.name}{t.label ? ` ${t.label}` : ''}</span>
					<input
						class="init"
						type="number"
						title="Initiative"
						placeholder="init"
						bind:value={t.init}
						onchange={persist}
					/>
					<span class="hp-wrap" title="Hit points">
						<input class="hp" type="number" bind:value={t.hp} onchange={() => updateHp(t)} />
						{#if t.kind === 'monster'}
							<span class="maxhp">/ {t.maxHp ?? '?'}</span>
						{:else}
							<span>/</span>
							<input
								class="hp"
								type="number"
								title="Max HP"
								placeholder="max"
								bind:value={t.maxHp}
								onchange={() => updateHp(t)}
							/>
						{/if}
					</span>
					<input
						class="dmg"
						type="number"
						placeholder="⚔"
						title="Damage dealt — press Enter to subtract from HP (negative heals)"
						bind:value={dmgDraft[t.id]}
						onkeydown={(e) => e.key === 'Enter' && applyDamage(t)}
						onblur={() => applyDamage(t)}
					/>
					<button
						class="row-x"
						title="Remove from battle"
						onclick={() => removeToken(t.id)}>✕</button
					>
				</li>
			{/each}
		</ul>
		<button class="small reset" onclick={resetEncounter}>↺ Reset encounter</button>
	</aside>
	</div>
{/if}

<svelte:window onkeydown={onKeydown} />

{#if sheet || sheetLoading}
	<div
		class="sheet-backdrop"
		role="button"
		tabindex="-1"
		onclick={() => (sheet = null)}
		onkeydown={(e) => e.key === 'Enter' && (sheet = null)}
	></div>
	<aside class="sheet">
		<button class="close" onclick={() => (sheet = null)}>✕ close</button>
		{#if sheetLoading}
			<p class="loading">Loading…</p>
		{:else if sheet}
			<StatBlock meta={sheet.meta} monster={sheet.monster} />
		{/if}
	</aside>
{/if}

{#if adding}
	<div
		class="sheet-backdrop"
		role="button"
		tabindex="-1"
		onclick={closeAdd}
		onkeydown={(e) => e.key === 'Enter' && closeAdd()}
	></div>
	<aside class="sheet">
		<button class="close" onclick={closeAdd}>✕ close</button>
		<h3 class="drawer-title">Add a creature</h3>
		<input
			class="drawer-search"
			type="search"
			placeholder="Search the bestiary or your characters…"
			bind:value={search}
			oninput={onSearchInput}
			use:focusOnMount
		/>
		{#if lastAdded}<p class="added">✓ {lastAdded} placed at the center of the map</p>{/if}
		{#if filteredNpcs.length}
			<p class="npc-head">Your characters</p>
			<ul class="results">
				{#each filteredNpcs as c (c.id)}
					<li>
						<button onclick={() => addNpc(c)}>
							{#if c.img}
								<img src={c.img} alt="" />
							{:else}
								<span class="dot" style="background:#6b4d8f"></span>
							{/if}
							<span class="rname">{c.name}</span>
							<span class="rmeta">
								{c.folder || 'ungrouped'}{c.sheetSlug ? ' · 📜 sheet' : ''}
							</span>
						</button>
					</li>
				{/each}
			</ul>
			<p class="npc-head">Bestiary</p>
		{/if}
		<ul class="results">
			{#if searching}<li class="note">searching…</li>{/if}
			{#each results as m (m.slug)}
				<li>
					<button onclick={() => addCreature(m)}>
						{#if m.img}
							<img src={m.img} alt="" />
						{:else}
							<span class="dot" style="background:{tokenColor(m.type)}"></span>
						{/if}
						<span class="rname">{m.name}</span>
						<span class="rmeta">CR {m.cr_text ?? '?'} · {m.size ?? ''} {m.type ?? ''}</span>
					</button>
				</li>
			{:else}
				{#if !searching && search.trim()}
					<li class="note">No matches.</li>
				{:else if !searching}
					<li class="note">Type to search — click a result to drop it on the map.</li>
				{/if}
			{/each}
		</ul>
	</aside>
{/if}

<style>
	.head {
		display: flex;
		align-items: center;
		gap: 1rem;
		flex-wrap: wrap;
	}
	h1 {
		margin: 0.25rem 0;
	}
	.status {
		color: var(--muted);
		font-size: 0.85rem;
	}
	.status.error {
		color: #e06c5b;
	}
	.scale {
		display: flex;
		align-items: center;
		gap: 0.4rem;
		color: var(--muted);
		font-size: 0.85rem;
	}
	.empty {
		color: var(--muted);
	}
	.drawer-title {
		color: var(--accent);
		margin: 0.2rem 0 0.6rem;
	}
	.drawer-search {
		width: 100%;
		box-sizing: border-box;
	}
	.added {
		color: var(--accent);
		font-size: 0.85rem;
		margin: 0.5rem 0 0;
	}
	.npc-head {
		color: var(--muted);
		font-size: 0.78rem;
		text-transform: uppercase;
		letter-spacing: 0.06em;
		margin: 0.7rem 0 0.3rem;
	}
	.results {
		list-style: none;
		margin: 0.6rem 0 0;
		padding: 0;
		display: grid;
		gap: 0.15rem;
	}
	.results .note {
		color: var(--muted);
		font-size: 0.85rem;
		padding: 0.3rem 0.5rem;
	}
	.results button {
		display: flex;
		align-items: center;
		gap: 0.55rem;
		width: 100%;
		background: transparent;
		border: none;
		text-align: left;
		padding: 0.35rem 0.5rem;
		border-radius: 6px;
	}
	.results button:hover {
		background: var(--panel-2);
	}
	.results img {
		width: 26px;
		height: 26px;
		border-radius: 50%;
		object-fit: cover;
	}
	.results .dot {
		width: 26px;
		height: 26px;
		border-radius: 50%;
		flex-shrink: 0;
	}
	.rname {
		flex: 1;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
	.rmeta {
		color: var(--muted);
		font-size: 0.78rem;
		white-space: nowrap;
	}
	.picker-filters {
		display: flex;
		flex-wrap: wrap;
		gap: 0.35rem;
		margin-bottom: 0.6rem;
	}
	.pf {
		border-radius: 99px;
		padding: 0.15rem 0.7rem;
		font-size: 0.85rem;
		color: var(--muted);
	}
	.pf.on {
		color: var(--accent);
		border-color: var(--accent);
		background: rgba(127, 191, 127, 0.08);
	}
	.suggest-note {
		color: var(--muted);
		font-size: 0.85rem;
		margin: 0 0 0.6rem;
	}
	.suggest-note b {
		color: var(--accent);
	}
	.picker {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
		gap: 1rem;
	}
	.map-choice {
		padding: 0;
		overflow: hidden;
		border-radius: 8px;
		text-align: left;
		display: grid;
	}
	.map-choice img {
		width: 100%;
		aspect-ratio: 4 / 3;
		object-fit: cover;
		display: block;
	}
	.map-choice span {
		padding: 0.35rem 0.6rem;
		font-size: 0.9rem;
	}
	.board {
		position: relative;
		max-width: 1100px;
		border: 2px solid var(--border);
		border-radius: 8px;
		overflow: hidden;
		touch-action: none;
		user-select: none;
	}
	.board > img {
		display: block;
		width: 100%;
		height: auto;
		pointer-events: none;
	}
	.tok {
		position: absolute;
		transform: translate(-50%, -50%);
		aspect-ratio: 1;
		border-radius: 50%;
		border: 2px solid;
		display: flex;
		align-items: center;
		justify-content: center;
		cursor: grab;
		box-shadow: 0 2px 6px rgba(0, 0, 0, 0.55);
	}
	.tok:active {
		cursor: grabbing;
	}
	.tok span {
		color: #fff;
		font-weight: 700;
		text-shadow: 0 1px 2px rgba(0, 0, 0, 0.8);
		pointer-events: none;
		font-size: clamp(8px, 1.1vw, 15px);
	}
	.tok .corner {
		position: absolute;
		right: -6%;
		bottom: -6%;
		background: rgba(13, 14, 17, 0.85);
		border-radius: 50%;
		min-width: 38%;
		aspect-ratio: 1;
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: clamp(7px, 0.8vw, 12px);
	}
	.hint {
		color: var(--muted);
		font-size: 0.85rem;
	}
	.battle-layout {
		display: grid;
		grid-template-columns: minmax(0, 1fr) 372px;
		gap: 1rem;
		align-items: start;
	}
	@media (max-width: 1000px) {
		.battle-layout {
			grid-template-columns: 1fr;
		}
	}
	.board-col {
		min-width: 0;
	}
	.tok-dead {
		filter: grayscale(1) brightness(0.55);
	}
	.tok-edit {
		cursor: not-allowed;
	}
	.tok-edit:hover {
		outline: 2px solid var(--danger);
		outline-offset: 2px;
	}
	.tok-x {
		position: absolute;
		top: -8%;
		right: -8%;
		background: var(--danger);
		color: #fff;
		border-radius: 50%;
		min-width: 34%;
		aspect-ratio: 1;
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: clamp(8px, 0.9vw, 13px);
		pointer-events: none;
		box-shadow: 0 1px 4px rgba(0, 0, 0, 0.6);
	}
	.edit-on {
		color: var(--danger);
		border-color: var(--danger);
	}
	.dmg {
		width: 2.4rem;
		font-size: 0.8rem;
		padding: 0.15rem 0.3rem;
		text-align: center;
		border-color: var(--accent-2);
	}
	.dmg::placeholder {
		color: var(--accent-2);
		opacity: 0.8;
	}
	.row-x {
		background: transparent;
		border: none;
		color: var(--muted);
		padding: 0 0.15rem;
		font-size: 0.8rem;
	}
	.row-x:hover {
		color: var(--danger);
	}
	.tok-active {
		outline: 3px solid #0fd06a;
		outline-offset: 2px;
		box-shadow:
			0 0 0 6px rgba(15, 208, 106, 0.2),
			0 0 18px rgba(15, 208, 106, 0.9);
	}
	.tracker {
		background: var(--panel);
		border: 1px solid var(--border);
		border-radius: 8px;
		padding: 0.8rem 0.9rem;
		position: sticky;
		top: 0.75rem;
	}
	.tracker-head {
		display: flex;
		align-items: center;
		gap: 0.45rem;
		flex-wrap: wrap;
		margin-bottom: 0.6rem;
	}
	.round {
		font-family: var(--serif);
		color: var(--accent);
		font-weight: 700;
		flex: 1;
	}
	.small {
		font-size: 0.8rem;
		padding: 0.25rem 0.55rem;
	}
	.next {
		background: var(--accent-2);
		border-color: var(--accent-2);
		font-weight: 600;
	}
	.combatants {
		list-style: none;
		margin: 0;
		padding: 0;
		display: grid;
		gap: 0.25rem;
		max-height: 60vh;
		overflow-y: auto;
		overflow-x: hidden;
	}
	.combatants li {
		display: flex;
		align-items: center;
		gap: 0.3rem;
		padding: 0.25rem 0.35rem;
		border-radius: 6px;
		border-left: 3px solid transparent;
	}
	.combatants li.active {
		background: var(--panel-2);
		border-left-color: #0fd06a;
	}
	.combatants li.dead {
		opacity: 0.45;
	}
	.combatants li.dead .cname {
		text-decoration: line-through;
	}
	.mini {
		width: 22px;
		height: 22px;
		border-radius: 50%;
		flex-shrink: 0;
		border: 1px solid var(--border);
	}
	.cname {
		flex: 1;
		min-width: 2.5rem;
		font-size: 0.85rem;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
	.init {
		width: 2.4rem;
		font-size: 0.8rem;
		padding: 0.15rem 0.3rem;
		text-align: center;
	}
	.hp-wrap {
		display: flex;
		align-items: center;
		gap: 0.15rem;
		font-size: 0.8rem;
		color: var(--muted);
	}
	.hp {
		width: 2.6rem;
		font-size: 0.8rem;
		padding: 0.15rem 0.3rem;
		text-align: center;
	}
	.maxhp {
		white-space: nowrap;
	}
	.reset {
		margin-top: 0.6rem;
		color: var(--muted);
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
		width: min(520px, 92vw);
		background: var(--bg);
		border-left: 1px solid var(--border);
		box-shadow: -8px 0 30px rgba(0, 0, 0, 0.5);
		z-index: 41;
		overflow-y: auto;
		padding: 0.9rem 1rem 2rem;
	}
	.close {
		margin-bottom: 0.6rem;
		font-size: 0.85rem;
	}
	.loading {
		color: var(--muted);
	}
</style>
