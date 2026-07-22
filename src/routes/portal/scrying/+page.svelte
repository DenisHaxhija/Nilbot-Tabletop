<svelte:head><title>The Scrying Pool · The Portal</title></svelte:head>

<h1>🔮 The Scrying Pool</h1>
<p class="tip">Where the players' deeds surface.</p>

<div class="pool">
	<span class="orb" aria-hidden="true">🔮</span>
	<p>
		The pool is still. When the bridge to the player portals opens, their actions ripple here —
		<i>“Charles Lazule casts Firebolt”</i> — awaiting your blessing or veto, spell slots counted,
		coin exchanged, all of it.
	</p>
	<p class="fine">the squid side is under construction</p>
</div>

<style>
	.tip {
		color: var(--muted);
	}
	.pool {
		max-width: 560px;
		margin-top: 2rem;
		border: 2px dashed var(--border);
		padding: 2.5rem 2rem;
		text-align: center;
		color: var(--muted);
		line-height: 1.7;
	}
	.orb {
		font-size: 3rem;
		display: block;
		margin-bottom: 0.8rem;
		filter: saturate(0.8);
	}
	.fine {
		font-style: italic;
		font-size: 0.85rem;
		opacity: 0.7;
		margin-bottom: 0;
	}
</style>
