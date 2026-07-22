<script lang="ts">
	import Token from '$lib/components/Token.svelte';
	import { invalidateAll } from '$app/navigation';

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

	// One gold amount box per player, defaulting to 10.
	let goldAmt = $state<Record<number, number>>({});
	let condPick = $state<Record<number, string>>({});
	let itemDraft = $state<Record<number, string>>({});

	async function patch(id: number, body: Record<string, unknown>) {
		await fetch(`/api/portal/players/${id}`, {
			method: 'PATCH',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(body)
		});
		invalidateAll();
	}
	const gold = (id: number) => Math.abs(Math.round(goldAmt[id] ?? 10)) || 10;
</script>

<svelte:head><title>Players · The Portal</title></svelte:head>

<h1>🧙 Players</h1>
<p class="tip">
	Inflict and bestow — conditions and coin land here first, and reach the players' portals when
	the bridge opens.
</p>

{#if data.players.length === 0}
	<p class="empty">
		No players in the party yet — summon them from the <a href="/portal">Overview</a>.
	</p>
{/if}

<div class="grid">
	{#each data.players as p (p.id)}
		<section class="card">
			<header>
				{#if p.img}
					<img src={p.img} alt={p.name} />
				{:else}
					<Token name={p.name} type={null} px={56} />
				{/if}
				<div class="who">
					<b>{p.name}</b>
					{#if p.class}<small>{p.class} · level {p.level}</small>{:else}<small>level {p.level}</small>{/if}
					{#if p.sheetSlug}
						<a class="sheet" href="/bestiary/{encodeURIComponent(p.sheetSlug)}">📜 {p.sheetName ?? 'sheet'}</a>
					{:else}
						<small class="nosheet">no sheet linked — link one on the dashboard party panel</small>
					{/if}
				</div>
				<span class="purse" title="Gold pieces">🪙 {p.gold}</span>
			</header>

			<div class="ctl">
				<span class="lbl">Level</span>
				<div class="row lvl">
					<button disabled={p.level <= 1} onclick={() => patch(p.id, { level: p.level - 1 })}>−</button>
					<span class="lvl-num">{p.level}</span>
					<button disabled={p.level >= 20} onclick={() => patch(p.id, { level: p.level + 1 })}>+</button>
				</div>
			</div>

			<div class="ctl">
				<span class="lbl">Ability Scores</span>
				<div class="stats">
					{#each STATS as s (s.key)}
						<label class="stat">
							<span>{s.label}</span>
							<input
								type="number"
								min="1"
								max="30"
								value={p.stats[s.key]}
								onchange={(e) =>
									patch(p.id, { stat: { key: s.key, value: Number(e.currentTarget.value) } })}
							/>
						</label>
					{/each}
				</div>
			</div>

			<div class="ctl">
				<span class="lbl">Coin</span>
				<div class="row">
					<input type="number" min="1" bind:value={goldAmt[p.id]} placeholder="10" />
					<button onclick={() => patch(p.id, { goldDelta: gold(p.id) })}>+ Grant</button>
					<button class="hurt" onclick={() => patch(p.id, { goldDelta: -gold(p.id) })}>− Dock</button>
				</div>
			</div>

			<div class="ctl">
				<span class="lbl">Conditions</span>
				{#if p.conditions.length}
					<div class="chips">
						{#each p.conditions as c (c)}
							<button
								class="chip"
								title="Click to lift {c}"
								onclick={() => patch(p.id, { removeCondition: c })}>{c} ✕</button
							>
						{/each}
					</div>
				{:else}
					<small class="fine">unafflicted</small>
				{/if}
				<div class="row">
					<select bind:value={condPick[p.id]}>
						<option value="" selected>afflict with…</option>
						{#each CONDITIONS.filter((c) => !p.conditions.includes(c)) as c (c)}
							<option value={c}>{c}</option>
						{/each}
					</select>
					<button
						class="hurt"
						disabled={!condPick[p.id]}
						onclick={() => {
							patch(p.id, { addCondition: condPick[p.id] });
							condPick[p.id] = '';
						}}>Inflict</button
					>
				</div>
			</div>

			<div class="ctl">
				<span class="lbl">Items</span>
				{#if p.items.length}
					<ul class="items">
						{#each p.items as it, i (i)}
							<li>
								{it}
								<button class="it-del" title="Take away" onclick={() => patch(p.id, { removeItem: i })}
									>✕</button
								>
							</li>
						{/each}
					</ul>
				{:else}
					<small class="fine">empty-handed</small>
				{/if}
				<form
					class="row"
					onsubmit={(e) => {
						e.preventDefault();
						if (!itemDraft[p.id]?.trim()) return;
						patch(p.id, { addItem: itemDraft[p.id] });
						itemDraft[p.id] = '';
					}}
				>
					<input class="it-in" bind:value={itemDraft[p.id]} placeholder="Bestow an item — e.g. Potion of Healing" />
					<button type="submit">＋ Give</button>
				</form>
			</div>
		</section>
	{/each}
</div>

<style>
	.tip {
		color: var(--muted);
	}
	.empty {
		color: var(--muted);
	}
	.grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(360px, 1fr));
		gap: 1rem;
		max-width: 1120px;
	}
	.card {
		background: var(--panel);
		border: 1px solid var(--border);
		border-top: 3px solid var(--accent-2);
		padding: 1rem 1.2rem;
		display: grid;
		gap: 0.9rem;
	}
	header {
		display: flex;
		align-items: center;
		gap: 0.9rem;
	}
	header img {
		width: 56px;
		height: 56px;
		object-fit: cover;
	}
	.who {
		display: grid;
		gap: 0.1rem;
		min-width: 0;
	}
	.who b {
		font-family: var(--pixel);
		font-size: 1.25rem;
		letter-spacing: 0.04em;
	}
	.who small {
		color: var(--muted);
	}
	.nosheet {
		font-style: italic;
		font-size: 0.75rem;
	}
	.sheet {
		font-size: 0.85rem;
		text-decoration: none;
	}
	.purse {
		margin-left: auto;
		font-family: var(--pixel);
		font-size: 1.3rem;
		color: #ffd37a;
		text-shadow: 2px 2px 0 #131022;
		white-space: nowrap;
	}
	.ctl {
		display: grid;
		gap: 0.4rem;
	}
	.lbl {
		font-family: var(--pixel);
		font-size: 0.95rem;
		letter-spacing: 0.1em;
		text-transform: uppercase;
		color: var(--accent);
	}
	.row {
		display: flex;
		gap: 0.5rem;
	}
	.row input {
		width: 5rem;
	}
	.row select {
		flex: 1;
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
	.fine {
		color: var(--muted);
		font-style: italic;
	}
	.lvl {
		align-items: center;
	}
	.lvl button {
		width: 2.1rem;
	}
	.lvl-num {
		font-family: var(--pixel);
		font-size: 1.5rem;
		min-width: 2.2rem;
		text-align: center;
		color: var(--accent);
		text-shadow: 2px 2px 0 #131022;
	}
	.stats {
		display: grid;
		grid-template-columns: repeat(6, 1fr);
		gap: 0.4rem;
	}
	.stat {
		display: grid;
		gap: 0.15rem;
		text-align: center;
	}
	.stat span {
		font-family: var(--pixel);
		font-size: 0.85rem;
		letter-spacing: 0.08em;
		color: var(--muted);
	}
	.stat input {
		width: 100%;
		text-align: center;
		box-sizing: border-box;
	}
	.items {
		list-style: none;
		margin: 0;
		padding: 0;
		display: grid;
		gap: 0.25rem;
	}
	.items li {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		font-size: 0.9rem;
		padding: 0.2rem 0.5rem;
		background: rgba(160, 140, 199, 0.07);
		border: 1px solid var(--border);
	}
	.it-del {
		margin-left: auto;
		background: transparent;
		border: none;
		color: var(--muted);
		cursor: pointer;
		padding: 0 0.2rem;
	}
	.it-del:hover {
		color: #ff8a9a;
	}
	.it-in {
		flex: 1;
	}
</style>
