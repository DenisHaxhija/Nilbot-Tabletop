# NilBot-Tabletop: the fork where the game lives

**Branch:** main (fork) · **Date:** 2026-07-22 · **Author:** Denis (+ Claude)

## What changed
This repo is a history-preserving fork of NilBot. The desktop shell's
injection layer (inject.js, theme-arcane.css, insertCSS/executeJavaScript
hacks) is deleted; everything it faked is now real code:
- Arcane sanctum theme in +layout.svelte (palette, VT323 pixel type,
  square corners, pixel scrollbars), with per-room accents driven by
  route (`.shell[data-room]`).
- ManaField.svelte: the living pixel backdrop with per-room moods
  (sanctum cyan rises, Emporium gold settles, Grimoire violet charges).
- Sidebar: The Emporium (⚖) and The Grimoire (✨) are the real labels;
  native ◀ MENU button in the layout returns to the title screen.
- Dashboard: "Well met" greeting + rotating flavor lines.
- Shop/Spells pages own their flavored h1s.

## Why
Injection fought SvelteKit's hydration (renames were stomped every
re-render — see the debugging session). The game diverged enough from
web NilBot to deserve its own repo; shared git history keeps
`git merge upstream/main` viable for core improvements.

## How to test
`npm run desktop` → title → create/open a campaign → sanctum theme with
living backdrop everywhere, Emporium gold / Grimoire violet rooms, no
flashes on navigation, sidebar names correct from first paint.

## Deploy steps
None (this repo has no deploy pipeline; web NilBot is untouched).
