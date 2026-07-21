<script lang="ts">
	import StatBlock from '$lib/components/StatBlock.svelte';
	let { data } = $props();
</script>

<svelte:head><title>{data.meta.name} · NilBot</title></svelte:head>

<div class="bar">
	<a href="/bestiary">← Bestiary</a>
	<a
		class="edit-link"
		href="/builder?edit={encodeURIComponent(data.slug)}"
		title={data.own
			? 'Open this sheet in the Sheet Builder'
			: 'Shared sheet — opens in the builder and saves as your own Custom copy'}
	>
		{data.own ? '✎ Edit sheet' : '✎ Edit a copy'}
	</a>
</div>

<div class="wrap">
	<StatBlock meta={data.meta} monster={data.monster} />
</div>

<style>
	.wrap {
		max-width: 760px;
	}
	.bar {
		display: flex;
		justify-content: space-between;
		align-items: center;
		max-width: 760px;
		margin: 1rem 0;
	}
	.edit-link {
		text-decoration: none;
		font-size: 0.85rem;
		border: 1px solid var(--border);
		border-radius: 6px;
		padding: 0.3rem 0.7rem;
		color: var(--text);
	}
	.edit-link:hover {
		border-color: var(--accent);
	}
</style>
