<script lang="ts">
	import { onMount } from 'svelte';

	// OneNote-style WYSIWYG canvas: contenteditable storing HTML. The parent
	// remounts this component per page ({#key}), so `initial` is read once.
	let {
		initial = '',
		onchange
	}: { initial?: string; onchange: (html: string) => void } = $props();

	let el: HTMLDivElement | undefined = $state();

	onMount(() => {
		if (el) el.innerHTML = initial;
	});

	function exec(cmd: string, val?: string) {
		document.execCommand('styleWithCSS', false, cmd === 'hiliteColor' ? 'true' : 'false');
		document.execCommand(cmd, false, val);
		el?.focus();
		if (el) onchange(el.innerHTML);
	}

	const BLOCKS = [
		['H1', 'H1'],
		['H2', 'H2'],
		['H3', 'H3'],
		['¶', 'P']
	] as const;
</script>

<div class="rt">
	<div class="toolbar" role="toolbar" aria-label="Text formatting">
		{#each BLOCKS as [label, tag] (tag)}
			<button
				title={tag === 'P' ? 'Normal text' : `Heading ${tag[1]}`}
				onmousedown={(e) => e.preventDefault()}
				onclick={() => exec('formatBlock', tag)}>{label}</button
			>
		{/each}
		<span class="sep"></span>
		<button class="b" title="Bold (Ctrl+B)" onmousedown={(e) => e.preventDefault()} onclick={() => exec('bold')}>B</button>
		<button class="i" title="Italic (Ctrl+I)" onmousedown={(e) => e.preventDefault()} onclick={() => exec('italic')}>I</button>
		<button class="u" title="Underline (Ctrl+U)" onmousedown={(e) => e.preventDefault()} onclick={() => exec('underline')}>U</button>
		<button class="s" title="Strikethrough" onmousedown={(e) => e.preventDefault()} onclick={() => exec('strikeThrough')}>S</button>
		<button title="Highlight" onmousedown={(e) => e.preventDefault()} onclick={() => exec('hiliteColor', 'rgba(247, 226, 138, 0.35)')}>🖊</button>
		<span class="sep"></span>
		<button title="Bulleted list" onmousedown={(e) => e.preventDefault()} onclick={() => exec('insertUnorderedList')}>•≡</button>
		<button title="Numbered list" onmousedown={(e) => e.preventDefault()} onclick={() => exec('insertOrderedList')}>1≡</button>
		<button title="Divider line" onmousedown={(e) => e.preventDefault()} onclick={() => exec('insertHorizontalRule')}>—</button>
		<span class="sep"></span>
		<button title="Clear formatting" onmousedown={(e) => e.preventDefault()} onclick={() => exec('removeFormat')}>Tx</button>
	</div>
	<div
		class="canvas"
		bind:this={el}
		contenteditable="true"
		role="textbox"
		aria-multiline="true"
		aria-label="Page content"
		tabindex="0"
		oninput={() => el && onchange(el.innerHTML)}
	></div>
</div>

<style>
	.rt {
		display: flex;
		flex-direction: column;
		flex: 1;
		min-height: 0;
	}
	.toolbar {
		display: flex;
		align-items: center;
		gap: 0.15rem;
		flex-wrap: wrap;
		padding: 0.35rem 0.4rem;
		background: var(--panel);
		border: 1px solid var(--border);
		border-radius: 8px 8px 0 0;
		border-bottom: none;
		position: sticky;
		top: 0;
		z-index: 5;
	}
	.toolbar button {
		background: transparent;
		border: 1px solid transparent;
		color: var(--muted);
		font-size: 0.85rem;
		min-width: 1.9rem;
		padding: 0.25rem 0.4rem;
		border-radius: 6px;
	}
	.toolbar button:hover {
		color: var(--text);
		border-color: var(--border);
		background: var(--panel-2);
	}
	.toolbar .b {
		font-weight: 700;
	}
	.toolbar .i {
		font-style: italic;
	}
	.toolbar .u {
		text-decoration: underline;
	}
	.toolbar .s {
		text-decoration: line-through;
	}
	.sep {
		width: 1px;
		height: 1.2rem;
		background: var(--border);
		margin: 0 0.25rem;
	}
	.canvas {
		flex: 1;
		min-height: 55vh;
		background: var(--panel);
		border: 1px solid var(--border);
		border-radius: 0 0 8px 8px;
		padding: 1rem 1.4rem;
		line-height: 1.65;
		overflow-y: auto;
		outline: none;
	}
	.canvas:focus {
		border-color: var(--accent);
	}
	.canvas:empty::before {
		content: 'Just start typing — like a OneNote page. Paste from OneNote keeps the formatting.';
		color: var(--muted);
		font-style: italic;
	}
	.canvas :global(h1),
	.canvas :global(h2),
	.canvas :global(h3) {
		font-family: var(--serif);
		color: var(--accent);
		margin: 0.7em 0 0.35em;
	}
	.canvas :global(hr) {
		border: none;
		border-top: 1px solid var(--border);
	}
	.canvas :global(a) {
		color: var(--accent);
	}
	.canvas :global(blockquote) {
		border-left: 3px solid var(--border);
		margin-left: 0;
		padding-left: 1rem;
		color: var(--muted);
	}
	.canvas :global(table) {
		border-collapse: collapse;
	}
	.canvas :global(td),
	.canvas :global(th) {
		border: 1px solid var(--border);
		padding: 0.3rem 0.6rem;
	}
	.canvas :global(img) {
		max-width: 100%;
	}
</style>
