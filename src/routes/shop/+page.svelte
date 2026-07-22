<script lang="ts">
	import { invalidateAll } from '$app/navigation';
	import { confirmDialog } from '$lib/confirm.svelte';
	let { data } = $props();

	let showCustom = $state(false);
	let cName = $state('');
	let cType = $state('');
	let cRarity = $state('');
	let cAttune = $state('');
	let cDesc = $state('');
	let cError = $state('');

	async function setStock(itemId: number, on: boolean, price = '') {
		await fetch('/api/shop/stock', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ itemId, on, price })
		});
		invalidateAll();
	}

	async function addCustom(e: SubmitEvent) {
		e.preventDefault();
		cError = '';
		const res = await fetch('/api/items', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ name: cName, type: cType, rarity: cRarity, attunement: cAttune, desc: cDesc })
		});
		const body = await res.json();
		if (!res.ok) {
			cError = body.error ?? 'Failed.';
			return;
		}
		cName = cType = cRarity = cAttune = cDesc = '';
		showCustom = false;
		invalidateAll();
	}

	async function removeCustom(id: number, name: string) {
		const ok = await confirmDialog({
			title: 'Delete item?',
			message: `“${name}” will be removed.`,
			confirmLabel: 'Delete',
			danger: true
		});
		if (!ok) return;
		await fetch(`/api/items/${id}`, { method: 'DELETE' });
		invalidateAll();
	}

	function pageUrl(p: number) {
		const params = new URLSearchParams();
		if (data.filters.q) params.set('q', data.filters.q);
		if (data.filters.rarity) params.set('rarity', data.filters.rarity);
		if (data.filters.cat) params.set('cat', data.filters.cat);
		if (p > 1) params.set('page', String(p));
		return `/shop?${params.toString()}`;
	}
	function catUrl(cat: string) {
		const params = new URLSearchParams();
		if (data.filters.q) params.set('q', data.filters.q);
		if (data.filters.rarity) params.set('rarity', data.filters.rarity);
		if (cat) params.set('cat', cat);
		return `/shop?${params.toString()}`;
	}
	const rarityClass = (r: string | null) =>
		(r ?? '').toLowerCase().replace(/\s+/g, '-').replace('very-rare', 'veryrare');
</script>

<svelte:head><title>Shop · NilBot</title></svelte:head>

<div class="head">
	<h1>⚖ The Emporium</h1>
	<div class="head-actions">
		<a class="present-link" href="/present/shop" target="_blank">▶ Present shop</a>
		<button onclick={() => (showCustom = !showCustom)}>＋ Custom item</button>
	</div>
</div>
<p class="tip">
	Stock items from the catalog (or your own creations) to build the shop your players browse on
	the TV. Prices are yours to set.
</p>

{#if showCustom}
	<form class="custom" onsubmit={addCustom}>
		<input bind:value={cName} placeholder="Item name" required />
		<input bind:value={cType} placeholder="Type (e.g. Wondrous item)" />
		<select bind:value={cRarity}>
			<option value="">rarity…</option>
			{#each ['Common', 'Uncommon', 'Rare', 'Very Rare', 'Legendary', 'Artifact'] as r (r)}
				<option value={r}>{r}</option>
			{/each}
		</select>
		<input bind:value={cAttune} placeholder="Attunement (blank = none)" />
		<textarea bind:value={cDesc} rows="3" placeholder="Description"></textarea>
		{#if cError}<p class="err">{cError}</p>{/if}
		<button type="submit">Add item</button>
	</form>
{/if}

<section class="stocked">
	<h2>Currently in stock ({data.stocked.length})</h2>
	{#if data.stocked.length === 0}
		<p class="empty">Empty shelves — stock something from the catalog below.</p>
	{:else}
		<ul>
			{#each data.stocked as s (s.id)}
				<li>
					<span class="sname">{s.name}</span>
					{#if s.rarity}<span class="rarity {rarityClass(s.rarity)}">{s.rarity}</span>{/if}
					<input
						class="price"
						placeholder="price (e.g. 450 gp)"
						value={s.price}
						onchange={(e) => setStock(s.id, true, (e.target as HTMLInputElement).value)}
					/>
					<button class="unstock" onclick={() => setStock(s.id, false)}>remove</button>
				</li>
			{/each}
		</ul>
	{/if}
</section>

<section>
	<h2>Catalog</h2>
	<div class="cats">
		<a href={catUrl('')} class:on={!data.filters.cat}>all</a>
		{#each data.categories as c (c)}
			<a href={catUrl(c)} class:on={data.filters.cat === c}>{c}</a>
		{/each}
	</div>
	<form method="GET" class="filters">
		{#if data.filters.cat}<input type="hidden" name="cat" value={data.filters.cat} />{/if}
		<input type="search" name="q" placeholder="Search items…" value={data.filters.q} />
		<select name="rarity">
			<option value="">Any rarity</option>
			{#each data.rarities as r (r)}
				<option value={r} selected={data.filters.rarity === r}>{r}</option>
			{/each}
		</select>
		<button type="submit">Filter</button>
		<span class="count">{data.total.toLocaleString()} items</span>
	</form>

	<ul class="catalog">
		{#each data.items as i (i.id)}
			<li>
				<details>
					<summary>
						<span class="sname">{i.name}</span>
						{#if i.rarity}<span class="rarity {rarityClass(i.rarity)}">{i.rarity}</span>{/if}
						<span class="itype">{i.type ?? ''}</span>
						{#if i.custom}<span class="custom-tag">custom</span>{/if}
						{#if i.suggested}<span class="sugg">~{i.suggested}</span>{/if}
						{#if i.stocked}
							<button class="unstock" onclick={(e) => { e.preventDefault(); setStock(i.id, false); }}>
								✓ stocked
							</button>
						{:else}
							<button
								class="stock"
								onclick={(e) => {
									e.preventDefault();
									setStock(i.id, true, i.suggested === 'priceless' ? '' : i.suggested);
								}}
							>
								＋ stock
							</button>
						{/if}
						{#if i.custom}
							<button class="delc" onclick={(e) => { e.preventDefault(); removeCustom(i.id, i.name); }}>✕</button>
						{/if}
					</summary>
					<div class="desc">
						{#if i.attunement}<p class="attune">{i.attunement}</p>{/if}
						<p>{i.desc}</p>
						<small>{i.source}</small>
					</div>
				</details>
			</li>
		{/each}
	</ul>

	{#if data.pages > 1}
		<div class="pager">
			{#if data.page > 1}<a href={pageUrl(data.page - 1)}>← Prev</a>{/if}
			<span>page {data.page} / {data.pages}</span>
			{#if data.page < data.pages}<a href={pageUrl(data.page + 1)}>Next →</a>{/if}
		</div>
	{/if}
</section>

<style>
	.head {
		display: flex;
		justify-content: space-between;
		align-items: center;
	}
	.head-actions {
		display: flex;
		gap: 0.5rem;
	}
	.present-link {
		text-decoration: none;
		background: var(--accent-2);
		border: 1px solid var(--accent-2);
		color: var(--text);
		border-radius: 6px;
		padding: 0.3rem 0.8rem;
		font-weight: 600;
		font-size: 0.9rem;
	}
	.tip {
		color: var(--muted);
	}
	.custom {
		display: grid;
		gap: 0.5rem;
		background: var(--panel);
		border: 1px solid var(--border);
		border-radius: 8px;
		padding: 0.9rem 1rem;
		margin-bottom: 1rem;
		max-width: 560px;
	}
	.err {
		color: var(--danger);
		margin: 0;
	}
	.stocked {
		background: var(--panel);
		border: 1px solid var(--border);
		border-left: 3px solid var(--accent-2);
		border-radius: 8px;
		padding: 0.7rem 1.1rem;
		margin-bottom: 1.4rem;
	}
	h2 {
		font-size: 1.1rem;
		color: var(--accent);
	}
	.empty {
		color: var(--muted);
	}
	.stocked ul,
	.catalog {
		list-style: none;
		margin: 0;
		padding: 0;
		display: grid;
		gap: 0.3rem;
	}
	.stocked li {
		display: flex;
		align-items: center;
		gap: 0.6rem;
	}
	.sname {
		font-weight: 600;
	}
	.stocked .sname {
		flex: 1;
	}
	.price {
		width: 9rem;
		font-size: 0.85rem;
		padding: 0.2rem 0.45rem;
	}
	.rarity {
		font-size: 0.7rem;
		text-transform: uppercase;
		border: 1px solid var(--border);
		border-radius: 99px;
		padding: 0.05rem 0.45rem;
		color: var(--muted);
		white-space: nowrap;
	}
	.rarity.common { color: #9aa0ab; }
	.rarity.uncommon { color: #7fbf7f; border-color: #7fbf7f; }
	.rarity.rare { color: #6aa3e0; border-color: #6aa3e0; }
	.rarity.veryrare { color: #b48ce0; border-color: #b48ce0; }
	.rarity.legendary { color: #e0a75b; border-color: #e0a75b; }
	.rarity.artifact { color: #e06c5b; border-color: #e06c5b; }
	.cats {
		display: flex;
		flex-wrap: wrap;
		gap: 0.35rem;
		margin-bottom: 0.6rem;
	}
	.cats a {
		text-decoration: none;
		color: var(--muted);
		border: 1px solid var(--border);
		border-radius: 99px;
		padding: 0.15rem 0.7rem;
		font-size: 0.85rem;
		text-transform: capitalize;
	}
	.cats a:hover {
		color: var(--text);
		border-color: var(--accent);
	}
	.cats a.on {
		color: var(--accent);
		border-color: var(--accent);
		background: rgba(127, 191, 127, 0.08);
	}
	.filters {
		display: flex;
		gap: 0.5rem;
		align-items: center;
		flex-wrap: wrap;
		margin-bottom: 0.6rem;
	}
	.filters input[type='search'] {
		flex: 1 1 200px;
		max-width: 320px;
	}
	.count {
		color: var(--muted);
		font-size: 0.85rem;
	}
	.catalog summary {
		display: flex;
		align-items: center;
		gap: 0.6rem;
		cursor: pointer;
		padding: 0.3rem 0.5rem;
		border-radius: 6px;
		list-style: none;
	}
	.catalog summary::-webkit-details-marker {
		display: none;
	}
	.catalog summary:hover {
		background: var(--panel-2);
	}
	.itype {
		color: var(--muted);
		font-size: 0.82rem;
		flex: 1;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
	.custom-tag {
		font-size: 0.7rem;
		color: var(--accent);
		border: 1px solid var(--accent);
		border-radius: 99px;
		padding: 0.02rem 0.4rem;
	}
	.sugg {
		color: var(--muted);
		font-size: 0.8rem;
		white-space: nowrap;
	}
	.stock,
	.unstock {
		font-size: 0.78rem;
		padding: 0.15rem 0.55rem;
		white-space: nowrap;
	}
	.unstock {
		color: var(--accent);
		border-color: var(--accent);
	}
	.delc {
		background: transparent;
		border: none;
		color: var(--muted);
		padding: 0 0.2rem;
	}
	.delc:hover {
		color: var(--danger);
	}
	.desc {
		padding: 0.4rem 0.8rem 0.7rem 1.5rem;
		color: var(--muted);
		font-size: 0.92rem;
		white-space: pre-wrap;
		max-width: 75ch;
	}
	.attune {
		font-style: italic;
		margin: 0 0 0.3rem;
	}
	.pager {
		display: flex;
		gap: 1rem;
		align-items: center;
		margin-top: 0.8rem;
	}
	.pager span {
		color: var(--muted);
	}
</style>
