<script lang="ts">
	import Token from '$lib/components/Token.svelte';
	let { data } = $props();

	function pageUrl(p: number) {
		const params = new URLSearchParams();
		for (const [k, v] of Object.entries(data.filters)) if (v) params.set(k, String(v));
		if (p > 1) params.set('page', String(p));
		return `/bestiary?${params.toString()}`;
	}
</script>

<svelte:head><title>Bestiary · NilBot</title></svelte:head>

<h1>Bestiary</h1>

<form method="GET" class="filters">
	<input type="search" name="q" placeholder="Search monsters…" value={data.filters.q} />
	<select name="type">
		<option value="">Any type</option>
		{#each data.facets.types as t (t)}
			<option value={t} selected={data.filters.type === t}>{t}</option>
		{/each}
	</select>
	<select name="size">
		<option value="">Any size</option>
		{#each data.facets.sizes as s (s)}
			<option value={s} selected={data.filters.size === s}>{s}</option>
		{/each}
	</select>
	<select name="source">
		<option value="">Any source</option>
		{#each data.facets.sources as s (s)}
			<option value={s} selected={data.filters.source === s}>{s}</option>
		{/each}
	</select>
	<input type="number" name="crMin" placeholder="CR min" step="any" min="0" value={data.filters.crMin} class="cr" />
	<input type="number" name="crMax" placeholder="CR max" step="any" min="0" value={data.filters.crMax} class="cr" />
	<button type="submit">Filter</button>
	<a href="/bestiary" class="clear">clear</a>
</form>

<p class="count">{data.total.toLocaleString()} monsters</p>

<table>
	<thead>
		<tr><th>Name</th><th>CR</th><th>Type</th><th>Size</th><th>AC</th><th>HP</th><th>Source</th></tr>
	</thead>
	<tbody>
		{#each data.monsters as m (m.slug)}
			<tr>
				<td class="name-cell">
					<Token name={m.name} type={m.type} px={28} img={m.img} />
					<a href="/bestiary/{encodeURIComponent(m.slug)}">{m.name}</a>
				</td>
				<td>{m.cr_text ?? '—'}</td>
				<td>{m.type ?? '—'}</td>
				<td>{m.size ?? '—'}</td>
				<td>{m.ac ?? '—'}</td>
				<td>{m.hp ?? '—'}</td>
				<td class="src">{m.source ?? '—'}</td>
			</tr>
		{/each}
	</tbody>
</table>

{#if data.pages > 1}
	<div class="pager">
		{#if data.page > 1}<a href={pageUrl(data.page - 1)}>← Prev</a>{/if}
		<span>page {data.page} / {data.pages}</span>
		{#if data.page < data.pages}<a href={pageUrl(data.page + 1)}>Next →</a>{/if}
	</div>
{/if}

<style>
	.filters {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem;
		align-items: center;
		margin-bottom: 0.5rem;
	}
	.filters input[type='search'] {
		flex: 1 1 220px;
	}
	.cr {
		width: 5.5rem;
	}
	.clear {
		color: var(--muted);
		font-size: 0.9rem;
	}
	.count {
		color: var(--muted);
		margin: 0.25rem 0 0.75rem;
	}
	table {
		width: 100%;
		border-collapse: collapse;
		background: var(--panel);
		border: 1px solid var(--border);
		border-radius: 8px;
		overflow: hidden;
	}
	th,
	td {
		text-align: left;
		padding: 0.45rem 0.7rem;
		border-bottom: 1px solid var(--border);
		font-size: 0.95rem;
	}
	th {
		color: var(--muted);
		font-weight: 600;
		background: var(--panel-2);
		position: sticky;
		top: 0;
	}
	tbody tr:nth-child(even) {
		background: rgba(255, 255, 255, 0.02);
	}
	tbody tr:hover {
		background: rgba(127, 191, 127, 0.07);
	}
	tbody td a {
		text-decoration: none;
	}
	tbody td a:hover {
		text-decoration: underline;
	}
	.src {
		color: var(--muted);
		font-size: 0.85rem;
	}
	.name-cell {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}
	.pager {
		display: flex;
		gap: 1rem;
		align-items: center;
		margin-top: 1rem;
	}
	.pager span {
		color: var(--muted);
	}
</style>
