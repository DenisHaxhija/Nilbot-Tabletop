<script lang="ts">
	import Token from '$lib/components/Token.svelte';
	import { page } from '$app/state';
	import { invalidateAll } from '$app/navigation';
	import { confirmDialog } from '$lib/confirm.svelte';
	import { CLASSES } from '$lib/classnotes';

	let { data } = $props();

	// The address players join through: LAN IP + this world's port.
	const tableAddrs = $derived(data.lanIps.map((ip: string) => `${ip}:${page.url.port}`));

	// A full invite: one artifact a player pastes or clicks — no addresses,
	// no separate keys. Sent through any channel (email, Discord, Steam chat).
	function inviteText(code: string, playerName: string) {
		const addr = tableAddrs[0] ?? `127.0.0.1:${page.url.port}`;
		return (
			`⚔ ${playerName}, you're invited to the table!\n` +
			`Click to take your seat: nilbot://join/${addr}/${code}\n` +
			`(or open NilBot Tabletop → Join a Campaign and paste: NILBOT-JOIN:${addr}:${code})`
		);
	}
	function mailtoInvite(code: string, playerName: string) {
		return (
			'mailto:?subject=' +
			encodeURIComponent("You're invited to a NilBot Tabletop campaign") +
			'&body=' +
			encodeURIComponent(inviteText(code, playerName))
		);
	}

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

	// --- invitations (the invite forges the character's sheet) ---
	let invName = $state('');
	let invPcName = $state('');
	let invClass = $state('');
	let invError = $state('');

	async function addInvite(e: SubmitEvent) {
		e.preventDefault();
		invError = '';
		const res = await fetch('/api/portal/invites', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ playerName: invName, pcName: invPcName, pcClass: invClass })
		});
		const body = await res.json();
		if (!res.ok) {
			invError = body.error ?? 'Could not cut the key.';
			return;
		}
		invName = '';
		invPcName = '';
		invClass = '';
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
			Cut a key, send the invite — email, Discord, Steam chat, anywhere. Your player clicks it
			(or pastes it in Join a Campaign) and they're seated. One invite, one player, works once,
			individually revocable. No invite, no entry.
		</p>
		{#if tableAddrs.length}
			<div class="addr">
				<span class="addr-lbl">Table address{tableAddrs.length > 1 ? 'es' : ''}</span>
				{#each tableAddrs as a (a)}
					<span class="addr-item"
						><code>{a}</code><button
							class="addr-copy"
							title="Copy address"
							onclick={() => navigator.clipboard.writeText(a)}>⧉</button
						></span
					>
				{/each}
				<span class="fine-inline">players enter this plus their key in Join a Campaign</span>
			</div>
		{/if}
		<form class="inv-form" onsubmit={addInvite}>
			<label class="field">
				<span>Player</span>
				<input bind:value={invName} placeholder="e.g. Leke" required />
			</label>
			<label class="field">
				<span>Character</span>
				<input bind:value={invPcName} placeholder="e.g. Charles Lazule" required />
			</label>
			<label class="field">
				<span>Class</span>
				<select bind:value={invClass}>
					<option value="">— pick later —</option>
					{#each CLASSES as c (c.name)}
						<option value={c.name}>{c.name}</option>
					{/each}
				</select>
			</label>
			<button class="cut" type="submit">＋ Cut a key</button>
		</form>
		<p class="forged">
			Cutting the key forges the character's sheet — level 1, class stats, starting gold and gear —
			ready to shape from <a href="/portal/players">Players</a>.
		</p>
		{#if invError}<p class="err">{invError}</p>{/if}
		{#if data.invites.length}
			<ul class="invites">
				{#each data.invites as inv (inv.id)}
					<li class:dead={inv.revoked}>
						<div class="inv-id">
							<span class="inv-who">{inv.player_name}</span>
							{#if inv.pc_name}<span class="inv-pc">as {inv.pc_name}</span>{/if}
						</div>
						<code class="inv-code">{inv.code}</code>
						<span class="inv-state">
							{#if inv.revoked}revoked{:else if inv.claimed_at}claimed ✓{:else}unclaimed{/if}
						</span>
						{#if !inv.revoked}
							<div class="inv-actions">
								{#if !inv.claimed_at}
									<button
										class="inv-copy"
										title="Copy invite — paste it to your player anywhere"
										onclick={() =>
											navigator.clipboard.writeText(inviteText(inv.code, inv.player_name))}
										>⧉ invite</button
									>
									<a
										class="inv-copy"
										title="Email the invite"
										href={mailtoInvite(inv.code, inv.player_name)}>✉</a
									>
								{/if}
								<button
									class="inv-del"
									title={inv.claimed_at ? 'Revoke — shuts their door' : 'Delete unused key'}
									onclick={() => removeInvite(inv)}>✕</button
								>
							</div>
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
		grid-template-columns: repeat(auto-fit, minmax(min(340px, 100%), 1fr));
		gap: 1rem;
		max-width: 1080px;
	}
	.panel {
		background: var(--panel);
		border: 1px solid var(--border);
		border-top: 3px solid var(--accent-2);
		padding: 1.1rem 1.3rem;
		min-width: 0;
		overflow: hidden;
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
		min-width: 0;
	}
	.pc b,
	.pc small {
		max-width: 100%;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
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
		top: 0;
		right: 4px;
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
	.pc-form input {
		min-width: 0;
		width: 100%;
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
		flex-wrap: wrap;
		align-items: center;
		gap: 0.3rem 0.9rem;
		border: 1px solid var(--border);
		background: var(--panel-2);
		padding: 0.55rem 0.8rem;
	}
	.ev-when {
		display: grid;
		flex: 0 0 auto;
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
		flex: 1 1 8rem;
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
		flex-wrap: wrap;
		gap: 0.5rem;
	}
	.ev-form .row input {
		flex: 1 1 11rem;
		min-width: 0;
	}
	.ev-form input {
		min-width: 0;
	}
	.err {
		color: var(--danger);
		margin: 0;
		font-size: 0.88rem;
	}
	.addr {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 0.25rem 0.8rem;
		color: var(--muted);
		font-size: 0.9rem;
		margin: 0 0 1rem;
		padding: 0.5rem 0.8rem;
		border: 1px solid var(--border);
		background: var(--panel-2);
	}
	.addr-lbl {
		font-family: var(--pixel);
		font-size: 1rem;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		color: var(--accent);
	}
	.addr-item {
		white-space: nowrap;
	}
	.addr code {
		color: var(--accent);
		letter-spacing: 0.06em;
		user-select: all;
	}
	.addr-copy {
		background: transparent;
		border: none;
		color: var(--muted);
		padding: 0 0.3rem;
		font-size: 0.95rem;
	}
	.addr-copy:hover {
		color: var(--accent);
	}
	.fine-inline {
		font-style: italic;
		font-size: 0.8rem;
	}
	.inv-pc {
		color: var(--muted);
		font-size: 0.85rem;
		font-style: italic;
	}
	.inv-hint {
		color: var(--muted);
		font-size: 0.9rem;
		margin: 0 0 0.8rem;
	}
	.inv-form {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(min(11rem, 100%), 1fr));
		gap: 0.6rem;
		align-items: end;
		max-width: 760px;
		margin-bottom: 0.4rem;
	}
	.field {
		display: grid;
		gap: 0.2rem;
		min-width: 0;
	}
	.field span {
		font-family: var(--pixel);
		font-size: 0.95rem;
		letter-spacing: 0.1em;
		text-transform: uppercase;
		color: var(--muted);
	}
	.field input,
	.field select {
		width: 100%;
		min-width: 0;
	}
	.cut {
		white-space: nowrap;
	}
	.forged {
		color: var(--muted);
		font-style: italic;
		font-size: 0.8rem;
		margin: 0 0 1rem;
	}
	.forged a {
		color: var(--accent);
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
		flex-wrap: wrap;
		align-items: center;
		gap: 0.25rem 0.9rem;
		border: 1px solid var(--border);
		background: var(--panel-2);
		padding: 0.45rem 0.8rem;
	}
	.invites li.dead {
		opacity: 0.45;
	}
	.inv-id {
		flex: 1 1 11rem;
		min-width: 0;
		display: flex;
		align-items: baseline;
		gap: 0.45rem;
	}
	.inv-who {
		font-family: var(--pixel);
		font-size: 1.1rem;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
	.inv-pc {
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
	.inv-code {
		letter-spacing: 0.14em;
		color: var(--accent);
		user-select: all;
	}
	.inv-state {
		color: var(--muted);
		font-size: 0.82rem;
		font-style: italic;
	}
	.inv-actions {
		margin-left: auto;
		display: flex;
		align-items: center;
		gap: 0.15rem;
		white-space: nowrap;
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
