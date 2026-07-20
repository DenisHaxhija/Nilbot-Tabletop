// App-wide confirmation dialog state. Call confirmDialog(...) from anywhere;
// the single <ConfirmDialog /> in the root layout renders it.

interface ConfirmOptions {
	title?: string;
	message: string;
	confirmLabel?: string;
	cancelLabel?: string;
	danger?: boolean;
}

export const dialogState = $state({
	open: false,
	title: 'Are you sure?',
	message: '',
	confirmLabel: 'Confirm',
	cancelLabel: 'Cancel',
	danger: false,
	resolve: null as ((ok: boolean) => void) | null
});

export function confirmDialog(opts: ConfirmOptions): Promise<boolean> {
	dialogState.title = opts.title ?? 'Are you sure?';
	dialogState.message = opts.message;
	dialogState.confirmLabel = opts.confirmLabel ?? 'Confirm';
	dialogState.cancelLabel = opts.cancelLabel ?? 'Cancel';
	dialogState.danger = opts.danger ?? false;
	dialogState.open = true;
	return new Promise((resolve) => {
		dialogState.resolve = resolve;
	});
}

export function settleDialog(ok: boolean) {
	dialogState.open = false;
	dialogState.resolve?.(ok);
	dialogState.resolve = null;
}
