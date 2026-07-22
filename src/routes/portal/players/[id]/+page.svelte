<script lang="ts">
	import Token from '$lib/components/Token.svelte';
	import { invalidateAll, goto } from '$app/navigation';
	import { confirmDialog } from '$lib/confirm.svelte';
	import { CLASSES, mod } from '$lib/classnotes';

	let { data } = $props();

	const CONDITIONS = [
		'blinded', 'charmed', 'deafened', 'frightened', 'grappled', 'incapacitated',
		'invisible', 'paralyzed', 'petrified', 'poisoned', 'prone', 'restrained',
		'stunned', 'unconscious', 'exhaustion'
	];
	const STATS: { key: 'str' | 'dex' | 'con' | 'intel' | 'wis' | 'cha'; label: string }[] = [
		{ key: 'str', label: 'STR' },
		{ key: 'dex', label: 'DEX' },
		{ key: 'con', label: 'CON' },
		{ key: 'intel', label: 'INT' },
		{ key: 'wis', label: 'WIS' },
		{ key: 'cha', label: 'CHA' }
	];

	// Free-text fields are edited locally and pushed on change, so a
	// background refresh never eats keystrokes.
	let name = $state(data.pc.name);
	let klass = $state(data.pc.class);
	let backstory = $state(data.pc.backstory);
	let backstorySaved = $state(true);
	let goldAmt = $state(10);
	let condPick = $state('');
	let itemDraft = $state('');
	let spellDraft = $state('');
	let portraitBust = $state(0);
	let fileInput = $state<HTMLInputElement>();
	let err = $state('');

	async function patch(body: Record<string, unknown>) {
		err = '';
		const res = await fetch(`/api/portal/players/${data.pc.id}`, {
			method: 'PATCH',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(body)
		});
		if (!res.ok) err = (await res.json()).error ?? 'The change did not take.';
		invalidateAll();
	}
	const gold = () => Math.abs(Math.round(goldAmt)) || 10;

	async function uploadPortrait() {
		const file = fileInput?.files?.[0];
		if (!file) return;
		err = '';
		const form = new FormData();
		form.set('file', file);
		const res = await fetch(`/api/portal/players/${data.pc.id}/portrait`, {
			method: 'POST',
			body: form
		});
		if (!res.ok) {
			err = (await res.json()).error ?? 'Upload failed.';
			return;
		}
		portraitBust++;
		if (fileInput) fileInput.value = '';
		invalidateAll();
	}

	async function removeFromParty() {
		const ok = await confirmDialog({
			title: 'Remove from the party?',
			message: `${data.pc.name} leaves the party — sheet, items and story go with them.`,
			confirmLabel: 'Remove',
			danger: true
		});
		if (!ok) return;
		await fetch(`/api/pcs/${data.pc.id}`, { method: 'DELETE' });
		goto('/portal/players');
	}
</script>

<svelte:head><title>{data.pc.name} · The Portal</title></svelte:head>

<a class="back" href="/portal/players">◀ Players</a>

<header class="hero">
	<button class="portrait" title="Change portrait" onclick={() => fileInput?.click()}>
		{#if data.pc.img}
			<img src="{data.pc.img}?v={portraitBust}" alt={data.pc.name} />
		{:else}
			<Token name={data.pc.name} type={null} px={84} />
		{/if}
		<span class="portrait-hint">✎</span>
	</button>
	<input
		class="hidden-file"
		type="file"
		bind:this={fileInput}
		accept=".png,.jpg,.jpeg,.webp,.gif"
		onchange={uploadPortrait}
	/>

	<div class="id">
		<input
			class="name-in"
			bind:value={name}
			onchange={() => name.trim() && patch({ name })}
			aria-label="Character name"
		/>
		<div class="id-row">
			<select bind:value={klass} onchange={() => patch({ class: klass })} aria-label="Class">
				<option value="">— classless —</option>
				{#each CLASSES as c (c.name)}
					<option value={c.name}>{c.name}</option>
				{/each}
			</select>
			<div class="lvl">
				<button disabled={data.pc.level <= 1} onclick={() => patch({ level: data.pc.level - 1 })}
					>−</button
				>
				<span class="lvl-num">lv {data.pc.level}</span>
				<button disabled={data.pc.level >= 20} onclick={() => patch({ level: data.pc.level + 1 })}
					>+</button
				>
			</div>
			<span class="purse" title="Gold pieces">🪙 {data.pc.gold}</span>
		</div>
	</div>
</header>

{#if err}<p class="err">{err}</p>{/if}

<div class="statrow">
	{#each STATS as s (s.key)}
		<label class="stat">
			<span class="s-lbl">{s.label}</span>
			<input
				type="number"
				min="1"
				max="30"
				value={data.pc.stats[s.key]}
				onchange={(e) => patch({ stat: { key: s.key, value: Number(e.currentTarget.value) } })}
			/>
			<span class="s-mod">{mod(data.pc.stats[s.key])}</span>
		</label>
	{/each}
</div>

<div class="grid">
	<section class="panel">
		<h2>Coin</h2>
		<div class="row">
			<input type="number" min="1" bind:value={goldAmt} placeholder="10" />
			<button onclick={() => patch({ goldDelta: gold() })}>+ Grant</button>
			<button class="hurt" onclick={() => patch({ goldDelta: -gold() })}>− Dock</button>
		</div>
	</section>

	<section class="panel">
		<h2>Conditions</h2>
		{#if data.pc.conditions.length}
			<div class="chips">
				{#each data.pc.conditions as c (c)}
					<button class="chip" title="Click to lift {c}" onclick={() => patch({ removeCondition: c })}
						>{c} ✕</button
					>
				{/each}
			</div>
		{:else}
			<p class="fine">unafflicted</p>
		{/if}
		<div class="row">
			<select bind:value={condPick}>
				<option value="" selected>afflict with…</option>
				{#each CONDITIONS.filter((c) => !data.pc.conditions.includes(c)) as c (c)}
					<option value={c}>{c}</option>
				{/each}
			</select>
			<button
				class="hurt"
				disabled={!condPick}
				onclick={() => {
					patch({ addCondition: condPick });
					condPick = '';
				}}>Inflict</button
			>
		</div>
	</section>

	<section class="panel">
		<h2>Items</h2>
		{#if data.pc.items.length}
			<ul class="list">
				{#each data.pc.items as it, i (i)}
					<li>
						{it}
						<button class="li-del" title="Take away" onclick={() => patch({ removeItem: i })}>✕</button>
					</li>
				{/each}
			</ul>
		{:else}
			<p class="fine">empty-handed</p>
		{/if}
		<form
			class="row"
			onsubmit={(e) => {
				e.preventDefault();
				if (!itemDraft.trim()) return;
				patch({ addItem: itemDraft });
				itemDraft = '';
			}}
		>
			<input
				class="grow"
				bind:value={itemDraft}
				list="item-options"
				placeholder={data.itemOptions.length
					? 'e.g. Potion of Healing — suggestions from the catalog'
					: 'e.g. Potion of Healing'}
			/>
			<datalist id="item-options">
				{#each data.itemOptions as it (it.name)}
					<option value={it.name}>{it.rarity ?? ''}</option>
				{/each}
			</datalist>
			<button type="submit">＋ Give</button>
		</form>
		<p class="whisper">
			Items from the catalog arrive on the player's sheet with their full description.
		</p>
	</section>

	<section class="panel">
		<h2>Spells</h2>
		{#if data.pc.spells.length}
			<ul class="list">
				{#each data.pc.spells as sp, i (i)}
					<li>
						{sp}
						<button class="li-del" title="Unlearn" onclick={() => patch({ removeSpell: i })}>✕</button>
					</li>
				{/each}
			</ul>
		{:else}
			<p class="fine">no spells granted</p>
		{/if}
		<form
			class="row"
			onsubmit={(e) => {
				e.preventDefault();
				if (!spellDraft.trim()) return;
				patch({ addSpell: spellDraft });
				spellDraft = '';
			}}
		>
			<input
				class="grow"
				bind:value={spellDraft}
				list="spell-options"
				placeholder={data.spellOptions.length
					? 'e.g. Fireball — suggestions from their class list'
					: 'type any spell name'}
			/>
			<datalist id="spell-options">
				{#each data.spellOptions as s (s.name)}
					<option value={s.name}>{s.level === 0 ? 'cantrip' : `level ${s.level}`}</option>
				{/each}
			</datalist>
			<button type="submit">＋ Teach</button>
		</form>
		<p class="whisper">
			Their seat also shows every {data.pc.class || 'class'} spell they can reach — this list is
			what you've personally granted.
		</p>
	</section>

	<section class="panel wide">
		<h2>Backstory</h2>
		<textarea
			bind:value={backstory}
			oninput={() => (backstorySaved = false)}
			onchange={() => {
				patch({ backstory });
				backstorySaved = true;
			}}
			rows="8"
			placeholder="Where they came from, what they owe, who they lost…"
		></textarea>
		<p class="whisper">{backstorySaved ? 'saved' : 'unsaved — click away to save'}</p>
	</section>

	<section class="panel wide danger">
		<h2>The Long Goodbye</h2>
		<button class="hurt" onclick={removeFromParty}>Remove {data.pc.name} from the party</button>
	</section>
</div>

<style>
	.back {
		display: inline-block;
		margin-bottom: 0.9rem;
		color: var(--muted);
		text-decoration: none;
		font-family: var(--pixel);
		font-size: 1.05rem;
		letter-spacing: 0.06em;
	}
	.back:hover {
		color: var(--accent);
	}
	.hero {
		display: flex;
		align-items: center;
		gap: 1.1rem;
		margin-bottom: 1.2rem;
	}
	.portrait {
		position: relative;
		padding: 0;
		background: transparent;
		border: 2px solid var(--border);
		cursor: pointer;
		line-height: 0;
	}
	.portrait img {
		width: 84px;
		height: 84px;
		object-fit: cover;
		display: block;
	}
	.portrait-hint {
		position: absolute;
		right: 2px;
		bottom: 2px;
		font-size: 0.85rem;
		color: var(--accent);
		background: rgba(18, 20, 42, 0.85);
		padding: 0 0.25rem;
		opacity: 0;
		line-height: 1.3;
	}
	.portrait:hover .portrait-hint {
		opacity: 1;
	}
	.portrait:hover {
		border-color: var(--accent);
	}
	.hidden-file {
		display: none;
	}
	.id {
		display: grid;
		gap: 0.45rem;
		min-width: 0;
		flex: 1;
	}
	.name-in {
		font-family: var(--pixel);
		font-size: 1.9rem;
		letter-spacing: 0.04em;
		background: transparent;
		border: 2px solid transparent;
		padding: 0.1rem 0.4rem;
		max-width: 26rem;
		min-width: 0;
	}
	.name-in:hover,
	.name-in:focus {
		border-color: var(--border);
		background: var(--panel-2);
	}
	.id-row {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 0.7rem;
	}
	.lvl {
		display: flex;
		align-items: center;
		gap: 0.3rem;
	}
	.lvl button {
		width: 2rem;
		padding: 0.25rem 0;
	}
	.lvl-num {
		font-family: var(--pixel);
		font-size: 1.3rem;
		min-width: 3rem;
		text-align: center;
		color: var(--accent);
		text-shadow: 2px 2px 0 #131022;
	}
	.purse {
		font-family: var(--pixel);
		font-size: 1.4rem;
		color: #ffd37a;
		text-shadow: 2px 2px 0 #131022;
		white-space: nowrap;
	}
	.statrow {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(min(86px, 100%), 1fr));
		gap: 0.6rem;
		max-width: 640px;
		margin-bottom: 1.2rem;
	}
	.stat {
		display: grid;
		justify-items: center;
		gap: 0.2rem;
		padding: 0.55rem 0.4rem;
		background: var(--panel);
		border: 1px solid var(--border);
		border-top: 3px solid var(--accent-2);
	}
	.s-lbl {
		font-family: var(--pixel);
		font-size: 0.9rem;
		letter-spacing: 0.12em;
		color: var(--muted);
	}
	.stat input {
		width: 3.4rem;
		text-align: center;
		font-family: var(--pixel);
		font-size: 1.3rem;
	}
	.s-mod {
		font-size: 0.85rem;
		color: var(--muted);
	}
	.grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(min(300px, 100%), 1fr));
		gap: 1rem;
		align-content: start;
		max-width: 1080px;
	}
	.panel {
		background: var(--panel);
		border: 1px solid var(--border);
		border-top: 3px solid var(--accent-2);
		padding: 1rem 1.2rem;
		min-width: 0;
		overflow: hidden;
		display: grid;
		gap: 0.6rem;
		align-content: start;
	}
	.panel.wide {
		grid-column: 1 / -1;
	}
	h2 {
		margin: 0;
		color: var(--accent);
		font-size: 1.25rem;
	}
	.row {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem;
	}
	.row input {
		width: 5rem;
		min-width: 0;
	}
	.row input.grow {
		flex: 1 1 10rem;
		width: auto;
	}
	.row select {
		flex: 1;
		min-width: 0;
	}
	.hurt {
		border-color: #6e3a4a;
		color: #ff8a9a;
	}
	.hurt:hover {
		border-color: #ff8a9a;
	}
	.hurt:disabled {
		opacity: 0.5;
		cursor: default;
	}
	.chips {
		display: flex;
		flex-wrap: wrap;
		gap: 0.35rem;
	}
	.chip {
		font-size: 0.82rem;
		padding: 0.15rem 0.6rem;
		background: rgba(255, 138, 154, 0.1);
		border: 1px solid #6e3a4a;
		color: #ff8a9a;
	}
	.chip:hover {
		border-color: #ff8a9a;
	}
	.list {
		list-style: none;
		margin: 0;
		padding: 0;
		display: grid;
		gap: 0.25rem;
	}
	.list li {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		font-size: 0.9rem;
		padding: 0.2rem 0.5rem;
		background: rgba(160, 140, 199, 0.07);
		border: 1px solid var(--border);
		min-width: 0;
	}
	.li-del {
		margin-left: auto;
		background: transparent;
		border: none;
		color: var(--muted);
		cursor: pointer;
		padding: 0 0.2rem;
	}
	.li-del:hover {
		color: #ff8a9a;
	}
	textarea {
		width: 100%;
		resize: vertical;
		line-height: 1.5;
	}
	.fine {
		color: var(--muted);
		font-style: italic;
		margin: 0;
	}
	.whisper {
		margin: 0;
		color: var(--muted);
		font-style: italic;
		font-size: 0.8rem;
	}
	.err {
		color: var(--danger);
		margin: 0 0 0.8rem;
	}
	.danger {
		border-top-color: #6e3a4a;
	}
	.danger button {
		justify-self: start;
	}
</style>
