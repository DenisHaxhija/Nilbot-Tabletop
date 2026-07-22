<script lang="ts">
	import '@fontsource/vt323/index.css';
	import { page } from '$app/state';
	import ConfirmDialog from '$lib/components/ConfirmDialog.svelte';
	import ManaField from '$lib/components/ManaField.svelte';
	let { children } = $props();

	const tabs = [
		{ href: '/portal', label: 'Overview', icon: '🌀', exact: true },
		{ href: '/portal/players', label: 'Players', icon: '🧙', exact: false },
		{ href: '/portal/scrying', label: 'The Scrying Pool', icon: '🔮', exact: false }
	];
	function active(t: { href: string; exact: boolean }) {
		return t.exact ? page.url.pathname === t.href : page.url.pathname.startsWith(t.href);
	}
</script>

<svelte:head><title>The Portal · NilBot Tabletop</title></svelte:head>

<ManaField />
<div class="portal-shell">
	<aside class="sidebar">
		<div class="brand">
			<span class="sigil">🌀</span>
			<span class="name">THE PORTAL</span>
		</div>
		<p class="sub">the bridge to your players</p>
		<nav>
			{#each tabs as t (t.href)}
				<a href={t.href} class:active={active(t)}>
					<span class="icon">{t.icon}</span><span class="label">{t.label}</span>
				</a>
			{/each}
		</nav>
		<div class="foot">
			<a href="/" class="back">⛨ Workbench</a>
		</div>
	</aside>
	<main>
		{@render children()}
	</main>
</div>

<ConfirmDialog />

<style>
	/* The Portal wears the squid's faded purple — the DM's end of the
	   bridge to the player side. */
	.portal-shell {
		--accent: #a08cc7;
		--accent-2: #5e4f85;
		display: grid;
		grid-template-columns: 224px 1fr;
		min-height: 100vh;
	}
	.sidebar {
		background: linear-gradient(180deg, #1c1832 0%, #151228 100%);
		border-right: 1px solid #38305a;
		padding: 1.1rem 0.85rem;
		display: flex;
		flex-direction: column;
		gap: 0.4rem;
		position: sticky;
		top: 0;
		height: 100vh;
		box-sizing: border-box;
	}
	.brand {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0 0.4rem;
	}
	.sigil {
		font-size: 1.3rem;
	}
	.name {
		font-family: var(--pixel);
		font-size: 1.35rem;
		letter-spacing: 0.12em;
		color: var(--accent);
		text-shadow: 2px 2px 0 #0b0c1e;
	}
	.sub {
		margin: 0 0 0.8rem;
		padding: 0 0.4rem;
		color: #8b86a8;
		font-style: italic;
		font-size: 0.8rem;
	}
	nav {
		display: grid;
		gap: 0.2rem;
	}
	nav a {
		display: flex;
		align-items: center;
		gap: 0.6rem;
		color: var(--text);
		text-decoration: none;
		font-family: var(--pixel);
		font-size: 1.2rem;
		letter-spacing: 0.05em;
		text-shadow: 1px 1px 0 #0b0c1e;
		padding: 0.4rem 0.6rem;
		border-left: 2px solid transparent;
		transition: background 0.15s ease;
	}
	.icon {
		width: 1.2rem;
		text-align: center;
		opacity: 0.85;
	}
	nav a:hover {
		background: rgba(160, 140, 199, 0.08);
	}
	nav a.active {
		background: rgba(160, 140, 199, 0.12);
		border-left-color: var(--accent);
		color: var(--accent);
	}
	.foot {
		margin-top: auto;
	}
	.back {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		color: #8b86a8;
		text-decoration: none;
		font-family: var(--pixel);
		font-size: 1.1rem;
		padding: 0.4rem 0.6rem;
	}
	.back:hover {
		color: #7ee0e8;
	}
	main {
		padding: 1.4rem 2rem 3rem;
		min-width: 0;
		max-width: 1280px;
	}
</style>
