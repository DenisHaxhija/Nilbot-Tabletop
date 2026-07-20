<script lang="ts">
	import StatBlock from '$lib/components/StatBlock.svelte';
	import { goto } from '$app/navigation';

	let description = $state('');
	let feedback = $state('');
	let sheet = $state<Record<string, any> | null>(null);
	let busy = $state(false);
	let confirming = $state(false);
	let errorMsg = $state('');
	let chatLog = $state<{ who: 'you' | 'ai'; text: string }[]>([]);

	let tokenInput: HTMLInputElement | undefined = $state();
	let tokenPreview = $state<string | null>(null);

	function onTokenPick() {
		const file = tokenInput?.files?.[0];
		if (tokenPreview) URL.revokeObjectURL(tokenPreview);
		tokenPreview = file ? URL.createObjectURL(file) : null;
	}

	const previewMeta = $derived(
		sheet
			? {
					img: tokenPreview,
					name: sheet.name,
					cr_text: sheet.challenge_rating,
					type: sheet.type,
					size: sheet.size,
					alignment: sheet.alignment,
					ac: sheet.armor_class,
					hp: sheet.hit_points,
					xp: null,
					source: 'Custom (preview)',
					layer: 'user'
				}
			: null
	);

	async function generate(refining: boolean) {
		busy = true;
		errorMsg = '';
		const fb = refining ? feedback.trim() : '';
		if (refining && fb) chatLog.push({ who: 'you', text: fb });
		try {
			const res = await fetch('/api/builder/generate', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					description,
					current: refining ? sheet : null,
					feedback: refining ? fb : null
				})
			});
			const body = await res.json();
			if (!res.ok) {
				errorMsg = body.error ?? 'Generation failed.';
				return;
			}
			sheet = body.sheet;
			chatLog.push({
				who: 'ai',
				text: refining
					? `Revised — now ${body.sheet.name}, CR ${body.sheet.challenge_rating}.`
					: `Drafted ${body.sheet.name} (CR ${body.sheet.challenge_rating}). Look it over — tell me what to change, or confirm it.`
			});
			feedback = '';
		} catch {
			errorMsg = 'Request failed.';
		} finally {
			busy = false;
		}
	}

	async function confirm() {
		if (!sheet) return;
		confirming = true;
		errorMsg = '';
		try {
			const form = new FormData();
			form.set('sheet', JSON.stringify(sheet));
			const file = tokenInput?.files?.[0];
			if (file) form.set('file', file);
			const res = await fetch('/api/builder/confirm', { method: 'POST', body: form });
			const body = await res.json();
			if (!res.ok) {
				errorMsg = body.error ?? 'Saving failed.';
				return;
			}
			goto(`/bestiary/${encodeURIComponent(body.slug)}`);
		} catch {
			errorMsg = 'Request failed.';
		} finally {
			confirming = false;
		}
	}
</script>

<svelte:head><title>Sheet Builder · NilBot</title></svelte:head>

<h1>Sheet Builder</h1>
<p class="tip">
	Describe a character or creature, add its token, and let the AI draft a full stat block.
	Refine it in chat until it's right, then add it to your bestiary as <b>Custom</b>.
</p>

<div class="builder">
	<div class="left">
		<label class="field">
			Who is this?
			<textarea
				bind:value={description}
				rows="7"
				placeholder="e.g. Grukk the Ash-Tongued — an old hobgoblin warlord who lost an eye to Anri's arrow. Fights with a whip and barked commands, tougher than a normal hobgoblin, should scare a level 5 party but be beatable…"
			></textarea>
		</label>

		<label class="field">
			Token image (optional)
			<input type="file" bind:this={tokenInput} accept=".png,.jpg,.jpeg,.webp,.gif" onchange={onTokenPick} />
		</label>
		{#if tokenPreview}
			<img class="token-preview" src={tokenPreview} alt="token preview" />
		{/if}

		{#if !sheet}
			<button class="primary" onclick={() => generate(false)} disabled={busy || !description.trim()}>
				{busy ? 'Designing…' : '✦ Generate sheet'}
			</button>
		{/if}

		{#if chatLog.length}
			<div class="chat">
				{#each chatLog as m, i (i)}
					<p class={m.who}>{m.who === 'you' ? 'You: ' : '◆ '}{m.text}</p>
				{/each}
			</div>
		{/if}

		{#if sheet}
			<label class="field">
				Refine it
				<textarea
					bind:value={feedback}
					rows="3"
					placeholder="e.g. drop the fire immunity, give him a reaction that punishes ranged attacks, CR should be 6"
				></textarea>
			</label>
			<div class="row">
				<button onclick={() => generate(true)} disabled={busy || !feedback.trim()}>
					{busy ? 'Revising…' : '↻ Revise'}
				</button>
				<button class="primary" onclick={confirm} disabled={busy || confirming}>
					{confirming ? 'Adding…' : '✓ Confirm — add to bestiary'}
				</button>
				<button
					class="subtle"
					onclick={() => {
						sheet = null;
						chatLog = [];
					}}
					disabled={busy}>start over</button
				>
			</div>
		{/if}

		{#if errorMsg}<p class="err">{errorMsg}</p>{/if}
	</div>

	<div class="right">
		{#if sheet && previewMeta}
			<StatBlock meta={previewMeta} monster={sheet} />
		{:else}
			<div class="placeholder">
				<p>The drafted stat block will appear here.</p>
			</div>
		{/if}
	</div>
</div>

<style>
	.tip {
		color: var(--muted);
	}
	.builder {
		display: grid;
		grid-template-columns: minmax(300px, 420px) minmax(0, 1fr);
		gap: 1.25rem;
		align-items: start;
	}
	@media (max-width: 900px) {
		.builder {
			grid-template-columns: 1fr;
		}
	}
	.left {
		display: grid;
		gap: 0.8rem;
	}
	.field {
		display: grid;
		gap: 0.3rem;
		font-size: 0.88rem;
		color: var(--muted);
	}
	textarea {
		resize: vertical;
		font: inherit;
		line-height: 1.5;
	}
	.token-preview {
		width: 64px;
		height: 64px;
		border-radius: 50%;
		object-fit: cover;
		border: 2px solid var(--border);
	}
	.primary {
		background: var(--accent-2);
		border-color: var(--accent-2);
		font-weight: 600;
	}
	.subtle {
		background: transparent;
		color: var(--muted);
	}
	.row {
		display: flex;
		gap: 0.5rem;
		flex-wrap: wrap;
	}
	.chat {
		background: var(--panel);
		border: 1px solid var(--border);
		border-radius: 8px;
		padding: 0.6rem 0.8rem;
		max-height: 200px;
		overflow-y: auto;
		display: grid;
		gap: 0.35rem;
	}
	.chat p {
		margin: 0;
		font-size: 0.85rem;
	}
	.chat .you {
		color: var(--muted);
	}
	.chat .ai {
		color: var(--accent);
	}
	.err {
		color: var(--danger);
		margin: 0;
	}
	.placeholder {
		border: 2px dashed var(--border);
		border-radius: 10px;
		min-height: 300px;
		display: flex;
		align-items: center;
		justify-content: center;
		color: var(--muted);
	}
</style>
