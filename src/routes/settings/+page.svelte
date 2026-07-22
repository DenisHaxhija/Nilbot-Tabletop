<script lang="ts">
	let { data, form } = $props();
</script>

<svelte:head><title>Settings · NilBot Tabletop</title></svelte:head>

<div class="wrap">
	<h1>Settings</h1>
	<!-- Tabletop: no account UI (identity is the shell's job) and no storage
	     quota (a local world's limit is your disk). App-level options like
	     fullscreen live on the title screen's Settings. -->

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
</div>

<style>
	.wrap {
		max-width: 620px;
		display: grid;
		gap: 1rem;
	}
	h1 {
		margin-bottom: 0;
	}
	.panel {
		background: var(--panel);
		border: 1px solid var(--border);
		padding: 1.1rem 1.3rem;
	}
	h2 {
		margin-top: 0;
		color: var(--accent);
		font-size: 1.1rem;
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
</style>
