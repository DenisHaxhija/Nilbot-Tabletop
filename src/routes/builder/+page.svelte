<script lang="ts">
	import StatBlock from '$lib/components/StatBlock.svelte';
	import SheetEditor from '$lib/components/SheetEditor.svelte';
	import { goto } from '$app/navigation';

	let { data } = $props();

	function loadMessage(edit: { own: boolean; sheet: any }) {
		return {
			who: 'ai' as const,
			text: edit.own
				? `Loaded ${edit.sheet.name} from your bestiary — refine it in chat, edit it by hand, or both. Saving updates the existing sheet.`
				: `Loaded ${edit.sheet.name} from the shared bestiary — refine it in chat or by hand. Saving adds it to your bestiary as your own Custom copy; the original stays untouched.`
		};
	}

	let description = $state('');
	let feedback = $state('');
	let sheet = $state<Record<string, any> | null>(data.edit ? data.edit.sheet : null);
	// Which sheet the editor was loaded from (drives resync on navigation).
	let loadedSlug = $state<string | null>(data.edit?.slug ?? null);
	// In-place update target (own sheets only) vs fork source (shared sheets).
	let editingSlug = $state<string | null>(data.edit?.own ? data.edit.slug : null);
	let sourceSlug = $state<string | null>(data.edit && !data.edit.own ? data.edit.slug : null);
	let manual = $state(false);
	let busy = $state(false);
	let confirming = $state(false);
	let errorMsg = $state('');
	let chatLog = $state<{ who: 'you' | 'ai'; text: string }[]>(
		data.edit ? [loadMessage(data.edit)] : []
	);

	let tokenInput: HTMLInputElement | undefined = $state();
	let tokenPreview = $state<string | null>(data.edit?.tokenUrl ?? null);

	function onTokenPick() {
		const file = tokenInput?.files?.[0];
		if (tokenPreview?.startsWith('blob:')) URL.revokeObjectURL(tokenPreview);
		tokenPreview = file ? URL.createObjectURL(file) : (data.edit?.tokenUrl ?? null);
	}

	// Blank Open5e-shaped sheet for building without AI.
	function startByHand() {
		sheet = {
			name: '',
			size: 'Medium',
			type: 'humanoid',
			alignment: 'unaligned',
			armor_class: 10,
			armor_desc: '',
			hit_points: 10,
			hit_dice: '',
			speed: { walk: 30 },
			strength: 10,
			dexterity: 10,
			constitution: 10,
			intelligence: 10,
			wisdom: 10,
			charisma: 10,
			skills: {},
			damage_vulnerabilities: '',
			damage_resistances: '',
			damage_immunities: '',
			condition_immunities: '',
			senses: '',
			languages: '',
			challenge_rating: '1',
			special_abilities: [],
			actions: [],
			bonus_actions: [],
			reactions: [],
			legendary_desc: '',
			legendary_actions: []
		};
		manual = true;
		chatLog = [
			{
				who: 'ai',
				text: 'Blank sheet — fill it in by hand. The AI chat still works if you want help along the way.'
			}
		];
	}

	// SvelteKit reuses this component across navigations — resync when the
	// ?edit target changes (or is cleared via the sidebar link).
	$effect(() => {
		if ((data.edit?.slug ?? null) === loadedSlug) return;
		loadedSlug = data.edit?.slug ?? null;
		editingSlug = data.edit?.own ? data.edit.slug : null;
		sourceSlug = data.edit && !data.edit.own ? data.edit.slug : null;
		sheet = data.edit ? data.edit.sheet : null;
		tokenPreview = data.edit?.tokenUrl ?? null;
		manual = false;
		feedback = '';
		errorMsg = '';
		if (tokenInput) tokenInput.value = '';
		chatLog = data.edit ? [loadMessage(data.edit)] : [];
	});

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
			if (editingSlug) form.set('slug', editingSlug);
			if (sourceSlug) form.set('source_slug', sourceSlug);
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
	{#if editingSlug}
		Editing <b>{sheet?.name}</b> — revise it in chat, flip on hand editing for direct control,
		then save your changes back to the bestiary.
	{:else if sourceSlug}
		Editing a copy of <b>{sheet?.name}</b> — the shared original stays untouched; saving adds
		your version to the bestiary as <b>Custom</b>.
	{:else}
		Describe a character or creature, add its token, and let the AI draft a full stat block —
		or start from a blank sheet and build it by hand. Refine in chat or edit directly until
		it's right, then add it to your bestiary as <b>Custom</b>.
	{/if}
</p>

<div class="builder">
	<div class="left">
		{#if !editingSlug && !sourceSlug}
			<label class="field">
				Who is this?
				<textarea
					bind:value={description}
					rows="7"
					placeholder="e.g. Grukk the Ash-Tongued — an old hobgoblin warlord who lost an eye to Anri's arrow. Fights with a whip and barked commands, tougher than a normal hobgoblin, should scare a level 5 party but be beatable…"
				></textarea>
			</label>
		{/if}

		<label class="field">
			Token image ({editingSlug || sourceSlug ? 'replace current' : 'optional'})
			<input type="file" bind:this={tokenInput} accept=".png,.jpg,.jpeg,.webp,.gif" onchange={onTokenPick} />
		</label>
		{#if tokenPreview}
			<img class="token-preview" src={tokenPreview} alt="token preview" />
		{/if}

		{#if !sheet}
			<div class="row">
				<button class="primary" onclick={() => generate(false)} disabled={busy || !description.trim()}>
					{busy ? 'Designing…' : '✦ Generate sheet'}
				</button>
				<button onclick={startByHand} disabled={busy} title="Skip the AI — start from a blank stat block">
					✎ Start by hand
				</button>
			</div>
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
				<button class:edit-on={manual} onclick={() => (manual = !manual)}>
					{manual ? '👁 Preview' : '✎ Edit by hand'}
				</button>
				<button class="primary" onclick={confirm} disabled={busy || confirming}>
					{confirming
						? 'Saving…'
						: editingSlug
							? '✓ Save changes'
							: sourceSlug
								? '✓ Save as my copy'
								: '✓ Confirm — add to bestiary'}
				</button>
				{#if !editingSlug && !sourceSlug}
					<button
						class="subtle"
						onclick={() => {
							sheet = null;
							chatLog = [];
							manual = false;
						}}
						disabled={busy}>start over</button
					>
				{/if}
			</div>
		{/if}

		{#if errorMsg}<p class="err">{errorMsg}</p>{/if}
	</div>

	<div class="right">
		{#if sheet && manual}
			{#key sheet}
				<SheetEditor bind:sheet />
			{/key}
		{:else if sheet && previewMeta}
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
	.edit-on {
		color: var(--accent);
		border-color: var(--accent);
		background: rgba(127, 191, 127, 0.08);
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
