<script lang="ts">
	import Token from '$lib/components/Token.svelte';
	import { invalidateAll } from '$app/navigation';
	import { confirmDialog } from '$lib/confirm.svelte';

	let { data } = $props();

	// --- players (the real people's characters — the party roster) ---
	let addingPc = $state(false);
	let pcName = $state('');
	let pcClass = $state('');
	let pcFileInput: HTMLInputElement | undefined = $state();
	let pcError = $state('');

	async function addPc(e: SubmitEvent) {
		e.preventDefault();
		pcError = '';
		const form = new FormData();
		form.set('name', pcName);
		form.set('class', pcClass);
		const file = pcFileInput?.files?.[0];
		if (file) form.set('file', file);
		const res = await fetch('/api/pcs', { method: 'POST', body: form });
		const body = await res.json();
		if (!res.ok) {
			pcError = body.error ?? 'Failed to add.';
			return;
		}
		pcName = '';
		pcClass = '';
		if (pcFileInput) pcFileInput.value = '';
		addingPc = false;
		invalidateAll();
	}

	async function removePc(id: number, name: string) {
		const ok = await confirmDialog({
			title: 'Remove from the party?',
			message: `${name} leaves the table.`,
			confirmLabel: 'Remove',
			danger: true
		});
		if (!ok) return;
		await fetch(`/api/pcs/${id}`, { method: 'DELETE' });
		invalidateAll();
	}

	// --- schedule ---
	let evTitle = $state('');
	let evAt = $state('');
	let evNote = $state('');
	let evError = $state('');

	async function addEvent(e: SubmitEvent) {
		e.preventDefault();
		evError = '';
		const res = await fetch('/api/schedule', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ title: evTitle, at: evAt, note: evNote })
		});
		const body = await res.json();
		if (!res.ok) {
			evError = body.error ?? 'Could not schedule.';
			return;
		}
		evTitle = '';
		evAt = '';
		evNote = '';
		invalidateAll();
	}

	async function removeEvent(id: number) {
		await fetch('/api/schedule', {
			method: 'DELETE',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ id })
		});
		invalidateAll();
	}

	// --- invitations ---
	let invName = $state('');
	let invError = $state('');

	async function addInvite(e: SubmitEvent) {
		e.preventDefault();
		invError = '';
		const res = await fetch('/api/portal/invites', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ playerName: invName })
		});
		const body = await res.json();
		if (!res.ok) {
			invError = body.error ?? 'Could not cut the key.';
			return;
		}
		invName = '';
		invalidateAll();
	}

	async function removeInvite(inv: { id: number; player_name: string; claimed_at: string | null }) {
		if (inv.claimed_at) {
			const ok = await confirmDialog({
				title: 'Revoke this key?',
				message: `${inv.player_name} will no longer be able to enter your campaign.`,
				confirmLabel: 'Revoke',
				danger: true
			});
			if (!ok) return;
		}
		await fetch('/api/portal/invites', {
			method: 'DELETE',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ id: inv.id, hard: !inv.claimed_at })
		});
		invalidateAll();
	}

	function when(at: string) {
		const d = new Date(at);
		return d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' }) +
			' · ' +
			d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
	}
	function countdown(at: string) {
		const ms = new Date(at).getTime() - Date.now();
		if (ms < 0) return 'happening / just past';
		const days = Math.floor(ms / 86400000);
		const hours = Math.floor((ms % 86400000) / 3600000);
		if (days > 0) return `in ${days} day${days === 1 ? '' : 's'}`;
		if (hours > 0) return `in ${hours} hour${hours === 1 ? '' : 's'}`;
		return 'very soon';
	}
</script>

<svelte:head><title>Portal · NilBot Tabletop</title></svelte:head>

<h1>🌀 The Portal</h1>
<p class="tip">The table beyond the table — your players, your game nights, and more to come.</p>

<div class="grid">
	<section class="panel">
		<h2>The Party</h2>
		{#if data.players.length === 0 && !addingPc}
			<p class="empty">No adventurers yet — summon your players.</p>
		{/if}
		<div class="party">
			{#each data.players as p (p.id)}
				<div class="pc">
					{#if p.img}
						<img class="pc-img" src={p.img} alt={p.name} />
					{:else}
						<Token name={p.name} type={null} px={52} />
					{/if}
					<b>{p.name}</b>
					{#if p.class}<small>{p.class}</small>{/if}
					<button class="pc-del" title="Remove" onclick={() => removePc(p.id, p.name)}>✕</button>
				</div>
			{/each}
		</div>
		{#if addingPc}
			<form class="pc-form" onsubmit={addPc}>
				<input bind:value={pcName} placeholder="Character name" required />
				<input bind:value={pcClass} placeholder="Class (optional)" />
				<input type="file" bind:this={pcFileInput} accept=".png,.jpg,.jpeg,.webp,.gif" />
				{#if pcError}<p class="err">{pcError}</p>{/if}
				<div class="row-btns">
					<button type="submit">Add</button>
					<button type="button" onclick={() => (addingPc = false)}>Cancel</button>
				</div>
			</form>
		{:else}
			<button class="ghost" onclick={() => (addingPc = true)}>＋ Summon a player</button>
		{/if}
	</section>

	<section class="panel">
		<h2>Game Nights</h2>
		{#if data.events.length === 0}
			<p class="empty">Nothing scheduled — the tavern stands empty.</p>
		{/if}
		<ul class="events">
			{#each data.events as ev (ev.id)}
				<li>
					<div class="ev-when">
						<b>{when(ev.at)}</b>
						<span class="soon">{countdown(ev.at)}</span>
					</div>
					<div class="ev-body">
						<span class="ev-title">{ev.title}</span>
						{#if ev.note}<small>{ev.note}</small>{/if}
					</div>
					<button class="ev-del" title="Cancel" onclick={() => removeEvent(ev.id)}>✕</button>
				</li>
			{/each}
		</ul>
		<form class="ev-form" onsubmit={addEvent}>
			<input bind:value={evTitle} placeholder="Session title — e.g. Into the Sunken Keep" />
			<div class="row">
				<input type="datetime-local" bind:value={evAt} required />
				<button type="submit">＋ Schedule</button>
			</div>
			<input bind:value={evNote} placeholder="Note — e.g. Leke brings snacks (optional)" />
			{#if evError}<p class="err">{evError}</p>{/if}
		</form>
	</section>

	<section class="panel wide">
		<h2>Invitations</h2>
		<p class="inv-hint">
			One key, one player. A key works exactly once — claiming binds it to whoever used it —
			and you can revoke anyone individually. No key, no entry: strangers can't join your
			campaign.
		</p>
		<form class="inv-form" onsubmit={addInvite}>
			<input bind:value={invName} placeholder="Player's name — e.g. Leke" required />
			<button type="submit">＋ Cut a key</button>
		</form>
		{#if invError}<p class="err">{invError}</p>{/if}
		{#if data.invites.length}
			<ul class="invites">
				{#each data.invites as inv (inv.id)}
					<li class:dead={inv.revoked}>
						<span class="inv-who">{inv.player_name}</span>
						<code class="inv-code">{inv.code}</code>
						<span class="inv-state">
							{#if inv.revoked}revoked{:else if inv.claimed_at}claimed ✓{:else}unclaimed{/if}
						</span>
						{#if !inv.revoked}
							<button
								class="inv-copy"
								title="Copy key"
								onclick={() => navigator.clipboard.writeText(inv.code)}>⧉</button
							>
							<button
								class="inv-del"
								title={inv.claimed_at ? 'Revoke — shuts their door' : 'Delete unused key'}
								onclick={() => removeInvite(inv)}>✕</button
							>
						{/if}
					</li>
				{/each}
			</ul>
		{:else}
			<p class="empty">No keys cut yet.</p>
		{/if}
		<p class="whisper">Claiming goes live with the squid bridge — cut keys now, hand them out when it opens.</p>
	</section>
</div>

<style>
	.tip {
		color: var(--muted);
	}
	.grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(340px, 1fr));
		gap: 1rem;
		max-width: 1080px;
	}
	.panel {
		background: var(--panel);
		border: 1px solid var(--border);
		padding: 1.1rem 1.3rem;
	}
	.panel.wide {
		grid-column: 1 / -1;
	}
	h2 {
		margin-top: 0;
		color: var(--accent);
		font-size: 1.35rem;
	}
	.empty {
		color: var(--muted);
	}
	.party {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(96px, 1fr));
		gap: 0.8rem;
		margin-bottom: 0.8rem;
	}
	.pc {
		position: relative;
		display: grid;
		justify-items: center;
		gap: 0.15rem;
		text-align: center;
	}
	.pc-img {
		width: 52px;
		height: 52px;
		object-fit: cover;
	}
	.pc b {
		font-size: 0.88rem;
	}
	.pc small {
		color: var(--muted);
		font-size: 0.75rem;
	}
	.pc-del {
		position: absolute;
		top: -6px;
		right: 6px;
		background: transparent;
		border: none;
		color: var(--muted);
		opacity: 0;
		padding: 0 0.2rem;
	}
	.pc:hover .pc-del {
		opacity: 1;
	}
	.pc-del:hover {
		color: var(--danger);
	}
	.pc-form {
		display: grid;
		gap: 0.5rem;
	}
	.row-btns {
		display: flex;
		gap: 0.5rem;
	}
	.ghost {
		background: transparent;
		border: 2px dashed var(--border);
		color: var(--muted);
	}
	.ghost:hover {
		color: var(--accent);
	}
	.events {
		list-style: none;
		margin: 0 0 0.9rem;
		padding: 0;
		display: grid;
		gap: 0.5rem;
	}
	.events li {
		display: flex;
		align-items: center;
		gap: 0.9rem;
		border: 1px solid var(--border);
		background: var(--panel-2);
		padding: 0.55rem 0.8rem;
	}
	.ev-when {
		display: grid;
		min-width: 10.5rem;
	}
	.ev-when b {
		font-size: 0.92rem;
	}
	.soon {
		color: var(--accent);
		font-size: 0.8rem;
	}
	.ev-body {
		display: grid;
		min-width: 0;
	}
	.ev-title {
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
	.ev-body small {
		color: var(--muted);
	}
	.ev-del {
		margin-left: auto;
		background: transparent;
		border: none;
		color: var(--muted);
		padding: 0 0.2rem;
	}
	.ev-del:hover {
		color: var(--danger);
	}
	.ev-form {
		display: grid;
		gap: 0.5rem;
	}
	.ev-form .row {
		display: flex;
		gap: 0.5rem;
	}
	.ev-form .row input {
		flex: 1;
	}
	.err {
		color: var(--danger);
		margin: 0;
		font-size: 0.88rem;
	}
	.inv-hint {
		color: var(--muted);
		font-size: 0.9rem;
		margin: 0 0 0.8rem;
	}
	.inv-form {
		display: flex;
		gap: 0.5rem;
		max-width: 420px;
		margin-bottom: 0.8rem;
	}
	.inv-form input {
		flex: 1;
	}
	.invites {
		list-style: none;
		margin: 0 0 0.8rem;
		padding: 0;
		display: grid;
		gap: 0.4rem;
	}
	.invites li {
		display: flex;
		align-items: center;
		gap: 0.8rem;
		border: 1px solid var(--border);
		background: var(--panel-2);
		padding: 0.45rem 0.8rem;
	}
	.invites li.dead {
		opacity: 0.45;
	}
	.inv-who {
		min-width: 7rem;
		font-family: var(--pixel);
		font-size: 1.1rem;
	}
	.inv-code {
		letter-spacing: 0.14em;
		color: var(--accent);
		user-select: all;
	}
	.inv-state {
		margin-left: auto;
		color: var(--muted);
		font-size: 0.82rem;
		font-style: italic;
	}
	.inv-copy,
	.inv-del {
		background: transparent;
		border: none;
		color: var(--muted);
		padding: 0 0.25rem;
	}
	.inv-copy:hover {
		color: var(--accent);
	}
	.inv-del:hover {
		color: var(--danger);
	}
	.whisper {
		margin: 0;
		color: var(--muted);
		font-style: italic;
		font-size: 0.85rem;
	}
</style>
