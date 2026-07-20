<script lang="ts">
	import StatBlock from '$lib/components/StatBlock.svelte';
	let { data } = $props();
</script>

<svelte:head><title>{data.meta.name} · NilBot</title></svelte:head>

<p><a href="/bestiary">← Bestiary</a></p>

<div class="wrap">
	<StatBlock meta={data.meta} monster={data.monster} />
</div>

<style>
	.wrap {
		max-width: 760px;
	}
</style>
