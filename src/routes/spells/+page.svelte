<script lang="ts">
	let { data } = $props();

	function pageUrl(p: number) {
		const params = new URLSearchParams();
		for (const [k, v] of Object.entries(data.filters)) if (v) params.set(k, String(v));
		if (p > 1) params.set('page', String(p));
		return `/spells?${params.toString()}`;
	}
	const lvlText = (l: number) => (l === 0 ? 'Cantrip' : `${l}`);
</script>

<svelte:head><title>Spells · NilBot</title></svelte:head>

<h1>✦ The Grimoire</h1>

<form method="GET" class="filters">
	<input type="search" name="q" placeholder="Search spells…" value={data.filters.q} />
	<select name="level">
		<option value="">Any level</option>
		<option value="0" selected={data.filters.level === '0'}>Cantrip</option>
		{#each [1, 2, 3, 4, 5, 6, 7, 8, 9] as l (l)}
			<option value={l} selected={data.filters.level === String(l)}>Level {l}</option>
		{/each}
	</select>
	<select name="school">
		<option value="">Any school</option>
		{#each data.facets.schools as s (s)}
			<option value={s} selected={data.filters.school === s}>{s}</option>
		{/each}
	</select>
	<select name="class">
		<option value="">Any class</option>
		{#each data.facets.classes as c (c)}
			<option value={c} selected={data.filters.class === c}>{c}</option>
		{/each}
	</select>
	<select name="source">
		<option value="">Any source</option>
		{#each data.facets.sources as s (s)}
			<option value={s} selected={data.filters.source === s}>{s}</option>
		{/each}
	</select>
	<button type="submit">Filter</button>
	<a href="/spells" class="clear">clear</a>
</form>

<p class="count">{data.total.toLocaleString()} spells</p>

{#if data.total === 0}
	<p class="empty">
		No spells yet — run <code>node scripts/import-open5e-spells.mjs</code> to load the shared
		compendium (or clear the filters).
	</p>
{:else}
	<table>
		<thead>
			<tr>
				<th>Name</th><th>Level</th><th>School</th><th>Time</th><th>Range</th><th>Duration</th>
				<th>Classes</th><th>Source</th>
			</tr>
		</thead>
		<tbody>
			{#each data.spells as s (s.slug)}
				<tr>
					<td class="name-cell">
						<a href="/spells/{encodeURIComponent(s.slug)}">{s.name}</a>
						{#if s.concentration}<span class="badge" title="Concentration">C</span>{/if}
						{#if s.ritual}<span class="badge" title="Ritual">R</span>{/if}
					</td>
					<td>{lvlText(s.level)}</td>
					<td>{s.school ?? '—'}</td>
					<td>{s.casting_time ?? '—'}</td>
					<td>{s.range ?? '—'}</td>
					<td>{s.duration ?? '—'}</td>
					<td class="src">{s.classes || '—'}</td>
					<td class="src">{s.source ?? '—'}</td>
				</tr>
			{/each}
		</tbody>
	</table>
{/if}

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
	.clear {
		color: var(--muted);
		font-size: 0.9rem;
	}
	.count {
		color: var(--muted);
		margin: 0.25rem 0 0.75rem;
	}
	.empty {
		color: var(--muted);
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
		font-size: 0.92rem;
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
	.name-cell {
		white-space: nowrap;
	}
	.badge {
		display: inline-block;
		font-size: 0.66rem;
		font-weight: 700;
		color: var(--accent);
		border: 1px solid var(--accent);
		border-radius: 4px;
		padding: 0 0.25rem;
		margin-left: 0.3rem;
		vertical-align: middle;
	}
	.src {
		color: var(--muted);
		font-size: 0.85rem;
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
