<script lang="ts">
	import '@fontsource/cinzel/600.css';
	import '@fontsource/cinzel/700.css';
	import goblin from '$lib/assets/goblin.png';
	import { page } from '$app/state';
	import { browser } from '$app/environment';
	import ConfirmDialog from '$lib/components/ConfirmDialog.svelte';
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
				{ href: '/spells', label: 'Spells', icon: '✨' },
				{ href: '/builder', label: 'Sheet Builder', icon: '✦' }
			]
		},
		{
			label: 'World',
			items: [
				{ href: '/characters', label: 'Characters', icon: '🎭' },
				{ href: '/worldmaps', label: 'World Maps', icon: '🌍' },
				{ href: '/shop', label: 'Shop', icon: '🛒' },
				{ href: '/music', label: 'Music', icon: '♪' },
				{ href: '/names', label: 'Name Generator', icon: '⚄' }
			]
		}
	];

	const bare = $derived(
		page.url.pathname.startsWith('/login') ||
			page.url.pathname.startsWith('/title') ||
			/^\/present\/((char|map)\/)?\d/.test(page.url.pathname) ||
			page.url.pathname === '/present/canvas' ||
			page.url.pathname === '/present/shop'
	);
</script>

<svelte:head>
	<link rel="icon" type="image/png" href={goblin} />
	<title>NilBot</title>
</svelte:head>

{#if bare}
	{@render children()}
{:else}
	<div class="shell" class:rail={collapsed}>
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
{/if}

<ConfirmDialog />

<style>
	:global(:root) {
		--bg: #16181d;
		--panel: #1e2128;
		--panel-2: #262a33;
		--border: #343945;
		--text: #d8dae0;
		--muted: #8a8f9c;
		--accent: #7fbf7f;
		--accent-2: #a3512e;
		--danger: #e06c5b;
		--serif: Georgia, 'Times New Roman', serif;
		color-scheme: dark;
	}
	:global(body) {
		margin: 0;
		background: var(--bg);
		color: var(--text);
		font-family: system-ui, -apple-system, 'Segoe UI', sans-serif;
		line-height: 1.55;
	}
	:global(h1, h2, h3) {
		font-family: var(--serif);
		letter-spacing: 0.01em;
	}
	:global(h1) {
		font-size: 1.7rem;
	}
	:global(a) {
		color: var(--accent);
	}
	:global(input, select, textarea, button) {
		background: var(--panel-2);
		color: var(--text);
		border: 1px solid var(--border);
		border-radius: 6px;
		padding: 0.45rem 0.6rem;
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
		background: rgba(127, 191, 127, 0.35);
	}
	:global(::-webkit-scrollbar) {
		width: 10px;
		height: 10px;
	}
	:global(::-webkit-scrollbar-thumb) {
		background: var(--border);
		border-radius: 6px;
	}
	:global(::-webkit-scrollbar-track) {
		background: transparent;
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
		font-family: 'Cinzel', var(--serif);
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
