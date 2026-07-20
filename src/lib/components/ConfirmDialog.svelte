<script lang="ts">
	import { dialogState, settleDialog } from '$lib/confirm.svelte';

	function onKeydown(e: KeyboardEvent) {
		if (!dialogState.open) return;
		if (e.key === 'Escape') settleDialog(false);
		if (e.key === 'Enter') settleDialog(true);
	}
</script>

<svelte:window onkeydown={onKeydown} />

{#if dialogState.open}
	<div
		class="backdrop"
		role="button"
		tabindex="-1"
		onclick={() => settleDialog(false)}
		onkeydown={() => {}}
	></div>
	<div class="modal" role="dialog" aria-modal="true" aria-label={dialogState.title}>
		<h3>{dialogState.title}</h3>
		<p>{dialogState.message}</p>
		<div class="actions">
			<button onclick={() => settleDialog(false)}>{dialogState.cancelLabel}</button>
			<button class="confirm" class:danger={dialogState.danger} onclick={() => settleDialog(true)}>
				{dialogState.confirmLabel}
			</button>
		</div>
	</div>
{/if}

<style>
	.backdrop {
		position: fixed;
		inset: 0;
		background: rgba(0, 0, 0, 0.55);
		z-index: 90;
		animation: fade 0.12s ease;
	}
	.modal {
		position: fixed;
		top: 50%;
		left: 50%;
		transform: translate(-50%, -50%);
		z-index: 91;
		background: var(--panel);
		border: 1px solid var(--border);
		border-top: 3px solid var(--accent-2);
		border-radius: 10px;
		padding: 1.2rem 1.4rem;
		width: min(420px, 90vw);
		box-shadow: 0 12px 40px rgba(0, 0, 0, 0.6);
		animation: pop 0.14s ease;
	}
	h3 {
		margin: 0 0 0.4rem;
		color: var(--accent);
	}
	p {
		margin: 0 0 1rem;
		color: var(--muted);
	}
	.actions {
		display: flex;
		justify-content: flex-end;
		gap: 0.6rem;
	}
	.confirm {
		background: var(--accent-2);
		border-color: var(--accent-2);
		font-weight: 600;
	}
	.confirm.danger {
		background: #7e332a;
		border-color: var(--danger);
	}
	.confirm.danger:hover {
		background: var(--danger);
	}
	@keyframes fade {
		from { opacity: 0; }
	}
	@keyframes pop {
		from {
			opacity: 0;
			transform: translate(-50%, -48%) scale(0.96);
		}
	}
</style>
