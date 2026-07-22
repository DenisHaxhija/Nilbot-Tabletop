<script lang="ts">
	import '@fontsource/cinzel/600.css';
	import '@fontsource/cinzel/700.css';
	import '@fontsource/vt323/index.css';
	import goblin from '$lib/assets/goblin.png';
	import { page } from '$app/state';
	import { browser } from '$app/environment';
	import ConfirmDialog from '$lib/components/ConfirmDialog.svelte';
	import ManaField from '$lib/components/ManaField.svelte';
	let { children } = $props();

	// Icon-only rail when collapsed; remembered per browser.
	let collapsed = $state(browser && localStorage.getItem('nb-sidebar') === '1');
	function toggleSidebar() {
		collapsed = !collapsed;
		localStorage.setItem('nb-sidebar', collapsed ? '1' : '0');
	}

	// Grouped by workflow: write prep → run combat → look things up →
	// manage the campaign world → generators.
	const sections = [
		{
			label: '',
			items: [{ href: '/notes', label: 'Sessions', icon: '✎' }]
		},
		{
			label: 'Combat',
			items: [
				{ href: '/battles', label: 'Battles', icon: '⚔' },
				{ href: '/present', label: 'Battle Ready', icon: '📺' },
				{ href: '/maps', label: 'Battle Maps', icon: '🗺' }
			]
		},
		{
			label: 'Library',
			items: [
				{ href: '/bestiary', label: 'Bestiary', icon: '🐉' },
				{ href: '/spells', label: 'The Grimoire', icon: '✨' },
				{ href: '/builder', label: 'Sheet Builder', icon: '✦' }
			]
		},
		{
			label: 'World',
			items: [
				{ href: '/characters', label: 'Characters', icon: '🎭' },
				{ href: '/worldmaps', label: 'World Maps', icon: '🌍' },
				{ href: '/shop', label: 'The Emporium', icon: '⚖' },
				{ href: '/music', label: 'Music', icon: '♪' },
				{ href: '/names', label: 'Name Generator', icon: '⚄' }
			]
		}
	];

	const bare = $derived(
		page.url.pathname.startsWith('/login') ||
			/^\/present\/((char|map)\/)?\d/.test(page.url.pathname) ||
			page.url.pathname === '/present/canvas' ||
			page.url.pathname === '/present/shop'
	);

	// Room dialects: the route drives the accent palette (see CSS below).
	const room = $derived(
		page.url.pathname.startsWith('/shop')
			? 'shop'
			: page.url.pathname.startsWith('/spells')
				? 'spells'
				: ''
	);
</script>

<svelte:head>
	<link rel="icon" type="image/png" href={goblin} />
	<title>NilBot</title>
</svelte:head>

{#if bare}
	{@render children()}
{:else}
	<ManaField />
	<div class="shell" class:rail={collapsed} data-room={room}>
		<aside class="sidebar">
			<div class="brand-row">
				<a class="brand" href="/" title="NilBot">
					<img class="brand-logo" src={goblin} alt="NilBot goblin logo" />
					{#if !collapsed}NilBot{/if}
				</a>
				<button
					class="collapse"
					title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
					onclick={toggleSidebar}>{collapsed ? '»' : '«'}</button
				>
			</div>
			<nav>
				{#each sections as sec (sec.label)}
					{#if sec.label}
						{#if collapsed}
							<span class="nav-divider"></span>
						{:else}
							<span class="nav-caption">{sec.label}</span>
						{/if}
					{/if}
					{#each sec.items as l (l.href)}
						<a href={l.href} title={l.label} class:active={page.url.pathname.startsWith(l.href)}>
							<span class="icon">{l.icon}</span>{#if !collapsed}<span class="label">{l.label}</span>{/if}
						</a>
					{/each}
				{/each}
			</nav>
			<div class="sidebar-foot">
				<a
					href="/journal"
					title="Journal"
					class="settings-link"
					class:active={page.url.pathname.startsWith('/journal')}
				>
					<span class="icon">📖</span>{#if !collapsed}<span class="label">Journal</span>{/if}
				</a>
				<a
					href="/settings"
					title="Settings"
					class="settings-link"
					class:active={page.url.pathname.startsWith('/settings')}
				>
					<span class="icon">⚙</span>{#if !collapsed}<span class="label">Settings</span>{/if}
				</a>
				{#if !collapsed}<p>the DM's workbench</p>{/if}
			</div>
		</aside>

		<main class:full={page.url.pathname.startsWith('/journal')}>
			{@render children()}
		</main>
	</div>
	<!-- Back to the game's title screen (the shell intercepts /__title). -->
	<a class="to-menu" href="/__title" data-sveltekit-reload>◀ MENU</a>
{/if}

<ConfirmDialog />

<style>
	/* NilBot Tabletop — the archmage's sanctum. Diverged from web NilBot on
	   purpose: arcane palette, pixel type, square corners, living backdrop. */
	:global(:root) {
		--bg: #12142a;
		--panel: #1a1d3a;
		--panel-2: #232752;
		--border: #3a3f6e;
		--text: #d6d9ee;
		--muted: #8b90b8;
		--accent: #7ee0e8;
		--accent-2: #5a4a9e;
		--danger: #ff8a9a;
		--serif: 'VT323', monospace;
		--pixel: 'VT323', monospace;
		color-scheme: dark;
	}
	/* Room dialects: same language, different accent. */
	:global(.shell[data-room='shop']) {
		--accent: #ffd37a;
		--accent-2: #8a6a30;
	}
	:global(.shell[data-room='spells']) {
		--accent: #b48aff;
		--accent-2: #5f3f9e;
	}
	:global(html) {
		background: #12142a;
	}
	:global(body) {
		margin: 0;
		background: transparent; /* the ManaField canvas shows through */
		color: var(--text);
		font-family: system-ui, -apple-system, 'Segoe UI', sans-serif;
		line-height: 1.55;
	}
	:global(h1, h2, h3) {
		font-family: var(--pixel);
		letter-spacing: 0.06em;
		text-shadow: 2px 2px 0 #0b0c1e;
	}
	:global(h1) {
		font-size: 2.1rem;
	}
	:global(a) {
		color: var(--accent);
	}
	:global(input, select, textarea, button) {
		background: var(--panel-2);
		color: var(--text);
		border: 2px solid var(--border);
		border-radius: 0;
		padding: 0.4rem 0.6rem;
		font: inherit;
		transition: border-color 0.15s ease, background 0.15s ease;
	}
	:global(button) {
		cursor: pointer;
	}
	:global(button:hover) {
		border-color: var(--accent);
	}
	:global(:focus-visible) {
		outline: 2px solid var(--accent);
		outline-offset: 1px;
	}
	:global(::selection) {
		background: rgba(126, 224, 232, 0.35);
	}
	:global(::-webkit-scrollbar) {
		width: 12px;
		height: 12px;
	}
	:global(::-webkit-scrollbar-thumb) {
		background: var(--border);
		border: 3px solid #12142a;
		border-radius: 0;
	}
	:global(::-webkit-scrollbar-track) {
		background: transparent;
	}
	/* Pixel discipline everywhere. */
	:global(*),
	:global(*)::before,
	:global(*)::after {
		border-radius: 0 !important;
	}
	.to-menu {
		position: fixed;
		bottom: 14px;
		right: 14px;
		z-index: 999;
		background: rgba(18, 20, 42, 0.92);
		color: var(--accent);
		border: 2px solid var(--border);
		padding: 5px 12px;
		font-family: var(--pixel);
		font-size: 0.95rem;
		letter-spacing: 0.08em;
		text-decoration: none;
	}
	.to-menu:hover {
		color: #ffe98a;
		border-color: var(--accent);
	}

	.shell {
		display: grid;
		grid-template-columns: 224px 1fr;
		min-height: 100vh;
	}
	.shell.rail {
		grid-template-columns: 64px 1fr;
	}
	.shell.rail .sidebar {
		padding: 1.1rem 0.5rem;
		align-items: center;
	}
	.shell.rail nav a,
	.shell.rail .settings-link {
		justify-content: center;
		padding: 0.45rem 0;
		width: 100%;
	}
	.brand-row {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.3rem;
	}
	.shell.rail .brand-row {
		flex-direction: column;
		gap: 0.5rem;
	}
	.collapse {
		background: transparent;
		border: 1px solid var(--border);
		border-radius: 6px;
		color: var(--muted);
		font-size: 0.85rem;
		padding: 0.1rem 0.45rem;
		flex-shrink: 0;
	}
	.collapse:hover {
		color: var(--text);
		border-color: var(--accent);
	}
	.sidebar {
		background: linear-gradient(180deg, var(--panel) 0%, #1a1d23 100%);
		border-right: 1px solid var(--border);
		padding: 1.1rem 0.85rem;
		display: flex;
		flex-direction: column;
		gap: 1.25rem;
		position: sticky;
		top: 0;
		height: 100vh;
		box-sizing: border-box;
	}
	.brand {
		font-family: var(--pixel);
		font-weight: 700;
		font-size: 1.3rem;
		color: var(--accent);
		text-decoration: none;
		letter-spacing: 0.06em;
		padding: 0 0.4rem;
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}
	.brand-logo {
		width: 30px;
		height: 30px;
		image-rendering: pixelated;
	}
	nav {
		display: grid;
		gap: 0.2rem;
	}
	.nav-caption {
		font-size: 0.68rem;
		text-transform: uppercase;
		letter-spacing: 0.09em;
		color: var(--muted);
		opacity: 0.75;
		padding: 0.7rem 0.6rem 0.15rem;
	}
	.nav-divider {
		display: block;
		height: 1px;
		background: var(--border);
		margin: 0.5rem 0.4rem;
	}
	nav a {
		display: flex;
		align-items: center;
		gap: 0.6rem;
		color: var(--text);
		text-decoration: none;
		font-size: 0.95rem;
		padding: 0.45rem 0.6rem;
		border-radius: 6px;
		border-left: 2px solid transparent;
		transition: background 0.15s ease, color 0.15s ease;
	}
	.icon {
		width: 1.2rem;
		text-align: center;
		opacity: 0.8;
	}
	nav a:hover {
		background: var(--panel-2);
	}
	nav a.active {
		background: var(--panel-2);
		color: var(--accent);
		border-left-color: var(--accent);
	}
	.sidebar-foot {
		margin-top: auto;
		display: grid;
		gap: 0.4rem;
	}
	.sidebar-foot p {
		color: var(--muted);
		font-size: 0.75rem;
		font-style: italic;
		padding: 0 0.4rem;
		opacity: 0.7;
		margin: 0;
	}
	.settings-link {
		display: flex;
		align-items: center;
		gap: 0.6rem;
		color: var(--muted);
		text-decoration: none;
		font-size: 0.92rem;
		padding: 0.4rem 0.6rem;
		border-radius: 6px;
	}
	.settings-link:hover {
		background: var(--panel-2);
		color: var(--text);
	}
	.settings-link.active {
		background: var(--panel-2);
		color: var(--accent);
	}

	main {
		padding: 1.4rem 2rem 3rem;
		min-width: 0;
		max-width: 1280px;
	}
	/* Full-bleed workspaces (Journal) — the content IS the surface. */
	main.full {
		padding: 0;
		max-width: none;
	}
	@media (max-width: 760px) {
		.shell {
			grid-template-columns: 1fr;
		}
		.sidebar {
			position: static;
			height: auto;
			flex-direction: row;
			align-items: center;
		}
		nav {
			display: flex;
			gap: 0.35rem;
			flex-wrap: wrap;
		}
		.sidebar-foot {
			display: none;
		}
		main {
			padding: 1rem 1rem 2.5rem;
		}
	}
</style>
