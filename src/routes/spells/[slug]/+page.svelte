<script lang="ts">
	import { marked } from 'marked';
	let { data } = $props();
	const s = $derived(data.spell);
	const lvlLine = $derived(
		s.level_int === 0
			? `${s.school ?? ''} cantrip`
			: `${s.level_int}${['th', 'st', 'nd', 'rd'][s.level_int % 10 > 3 ? 0 : s.level_int % 10]}-level ${(s.school ?? '').toLowerCase()}`
	);
</script>

<svelte:head><title>{s.name} · NilBot</title></svelte:head>

<p><a href="/spells">← Spells</a></p>

<article class="spell">
	<h1>{s.name}</h1>
	<p class="sub">
		{lvlLine}{s.ritual === 'yes' ? ' (ritual)' : ''}
	</p>
	<dl>
		<div><dt>Casting time</dt><dd>{s.casting_time ?? '—'}</dd></div>
		<div><dt>Range</dt><dd>{s.range ?? '—'}</dd></div>
		<div><dt>Components</dt><dd>{s.components ?? '—'}{s.material ? ` (${s.material})` : ''}</dd></div>
		<div>
			<dt>Duration</dt>
			<dd>{s.concentration === 'yes' ? 'Concentration, ' : ''}{s.duration ?? '—'}</dd>
		</div>
		<div><dt>Classes</dt><dd>{s.dnd_class ?? '—'}</dd></div>
	</dl>
	<div class="desc">
		<!-- eslint-disable-next-line svelte/no-at-html-tags -->
		{@html marked(s.desc ?? '')}
		{#if s.higher_level}
			<p><b>At higher levels.</b> {s.higher_level}</p>
		{/if}
	</div>
	<p class="src">{data.source}</p>
</article>

<style>
	.spell {
		max-width: 720px;
		background: var(--panel);
		border: 1px solid var(--border);
		border-radius: 10px;
		padding: 1.3rem 1.6rem;
	}
	h1 {
		margin: 0;
		color: var(--accent);
		font-family: var(--serif);
	}
	.sub {
		font-style: italic;
		color: var(--muted);
		margin: 0.2rem 0 0.9rem;
	}
	dl {
		display: grid;
		gap: 0.25rem;
		margin: 0 0 0.9rem;
		border-top: 1px solid var(--border);
		border-bottom: 1px solid var(--border);
		padding: 0.6rem 0;
	}
	dl div {
		display: flex;
		gap: 0.5rem;
	}
	dt {
		font-weight: 600;
		min-width: 8.5rem;
	}
	dd {
		margin: 0;
		color: var(--muted);
	}
	.desc {
		line-height: 1.6;
	}
	.src {
		color: var(--muted);
		font-size: 0.85rem;
		margin-bottom: 0;
	}
</style>
