<script lang="ts">
	let { data, form } = $props();
</script>

<svelte:head><title>Settings · NilBot</title></svelte:head>

<h1>Settings</h1>

<div class="panels">
	<section class="panel">
		<h2>General</h2>
		<form method="POST" action="?/general">
			<label>
				DM name
				<input name="dm_name" value={data.settings.dm_name} required />
				<small>Shown on the dashboard greeting.</small>
			</label>
			<div class="row">
				<label>
					Default party level
					<input name="party_level" type="number" min="1" max="20" value={data.settings.party_level} />
				</label>
				<label>
					Default party size
					<input name="party_size" type="number" min="1" max="10" value={data.settings.party_size} />
				</label>
			</div>
			<small>Used as the starting values in the Battle Extractor.</small>
			{#if form?.general}<p class="err">{form.general}</p>{/if}
			{#if form?.generalSaved}<p class="ok">✓ Saved</p>{/if}
			<button type="submit">Save</button>
		</form>
	</section>

	<section class="panel">
		<h2>Password</h2>
		<form method="POST" action="?/password">
			<label>
				Current password
				<input name="current" type="password" required autocomplete="current-password" />
			</label>
			<label>
				New password
				<input name="next" type="password" required minlength="6" autocomplete="new-password" />
			</label>
			<label>
				Confirm new password
				<input name="confirm" type="password" required autocomplete="new-password" />
			</label>
			{#if form?.password}<p class="err">{form.password}</p>{/if}
			<button type="submit">Change password</button>
			<small>You'll be asked to log in again afterwards.</small>
		</form>
	</section>

	<section class="panel">
		<h2>Account</h2>
		<p class="muted">Logged in as <b>{data.username}</b>.</p>
		<form method="POST" action="?/logout">
			<button type="submit" class="logout">Log out</button>
		</form>
	</section>
</div>

<style>
	.panels {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
		gap: 1rem;
		max-width: 980px;
	}
	.panel {
		background: var(--panel);
		border: 1px solid var(--border);
		border-radius: 10px;
		padding: 1.1rem 1.3rem;
	}
	h2 {
		margin-top: 0;
		color: var(--accent);
		font-size: 1.15rem;
	}
	form {
		display: grid;
		gap: 0.75rem;
	}
	label {
		display: grid;
		gap: 0.25rem;
		font-size: 0.88rem;
		color: var(--muted);
	}
	.row {
		display: flex;
		gap: 0.75rem;
	}
	.row label {
		flex: 1;
	}
	small {
		color: var(--muted);
		opacity: 0.85;
	}
	button {
		justify-self: start;
	}
	.logout {
		border-color: var(--danger);
		color: var(--danger);
		background: transparent;
	}
	.logout:hover {
		background: #7e332a;
		color: var(--text);
	}
	.err {
		color: var(--danger);
		margin: 0;
		font-size: 0.88rem;
	}
	.ok {
		color: var(--accent);
		margin: 0;
		font-size: 0.88rem;
	}
	.muted {
		color: var(--muted);
	}
</style>
