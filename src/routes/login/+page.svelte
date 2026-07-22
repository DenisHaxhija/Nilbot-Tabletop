<script lang="ts">
	import '@fontsource/cinzel/700.css';
	import { page } from '$app/state';
	import goblin from '$lib/assets/goblin.png';
	let { data, form } = $props();
	let registering = $state(false);
	const showSetup = $derived(data.firstRun || registering);
	// Carry the post-login destination through the form action ("?/x" would drop it).
	const nextQ = $derived.by(() => {
		const next = page.url.searchParams.get('next');
		return next ? `&next=${encodeURIComponent(next)}` : '';
	});
</script>

<svelte:head><title>{data.firstRun ? 'Welcome' : 'Log in'} · NilBot</title></svelte:head>

<div class="gate">
	<div class="card">
		<img src={goblin} alt="NilBot" class="logo" />
		<h1>NilBot</h1>
		{#if showSetup}
			<p class="sub">
				{data.firstRun ? 'First time here — create your DM account.' : 'Create your DM account.'}
			</p>
			<form method="POST" action="?/setup{nextQ}">
				<label>Name <input name="username" required minlength="2" autocomplete="username" /></label>
				<label>
					Password
					<input name="password" type="password" required minlength="6" autocomplete="new-password" />
				</label>
				<label>
					Confirm password
					<input name="confirm" type="password" required autocomplete="new-password" />
				</label>
				{#if form?.error}<p class="err">{form.error}</p>{/if}
				<button type="submit">Create &amp; enter</button>
			</form>
			{#if !data.firstRun}
				<button class="link" onclick={() => (registering = false)}>← back to login</button>
			{/if}
		{:else}
			<p class="sub">Say Hi to Anri, Patrick, Charles and Echo</p>
			<form method="POST" action="?/login{nextQ}">
				<label>Name <input name="username" required autocomplete="username" /></label>
				<label>
					Password
					<input name="password" type="password" required autocomplete="current-password" />
				</label>
				{#if form?.error}<p class="err">{form.error}</p>{/if}
				<button type="submit">Enter</button>
			</form>
			<button class="link" onclick={() => (registering = true)}>New DM? Create an account</button>
		{/if}
	</div>
</div>

<style>
	.gate {
		min-height: 100vh;
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 1rem;
		box-sizing: border-box;
	}
	.card {
		background: var(--panel);
		border: 1px solid var(--border);
		border-top: 3px solid var(--accent-2);
		border-radius: 12px;
		padding: 2rem 2.2rem;
		width: min(360px, 92vw);
		text-align: center;
		box-shadow: 0 12px 40px rgba(0, 0, 0, 0.5);
	}
	.logo {
		width: 72px;
		height: 72px;
		image-rendering: pixelated;
	}
	h1 {
		margin: 0.4rem 0 0.2rem;
		color: var(--accent);
		font-family: 'Cinzel', Georgia, serif;
		letter-spacing: 0.06em;
	}
	.sub {
		color: var(--muted);
		font-style: italic;
		margin: 0 0 1.2rem;
	}
	form {
		display: grid;
		gap: 0.8rem;
		text-align: left;
	}
	label {
		display: grid;
		gap: 0.25rem;
		font-size: 0.88rem;
		color: var(--muted);
	}
	button {
		margin-top: 0.4rem;
		background: var(--accent-2);
		border-color: var(--accent-2);
		font-weight: 600;
	}
	.err {
		color: var(--danger);
		font-size: 0.88rem;
		margin: 0;
	}
	.link {
		background: transparent;
		border: none;
		color: var(--muted);
		font-size: 0.85rem;
		margin-top: 0.9rem;
		padding: 0;
	}
	.link:hover {
		color: var(--accent);
		border: none;
	}
</style>
