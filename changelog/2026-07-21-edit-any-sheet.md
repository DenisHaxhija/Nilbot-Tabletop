# Edit any bestiary sheet + build battles by hand

**Branch:** feature/edit-any-sheet · **Date:** 2026-07-21 · **Author:** Denis (+ Claude)

## What changed
The edit button on bestiary pages now appears on every sheet, not just
your own. Your own Custom sheets behave as before ("✎ Edit sheet",
saves in place). Shared Open5e sheets show "✎ Edit a copy": the builder
loads them fully editable (AI chat + hand editor), and saving creates a
new Custom sheet owned by you — the shared original is never modified
(it's shared across accounts and re-importing would overwrite edits
anyway). The copy keeps the original's token art unless you upload a
replacement (a reference to the shared instance asset — no storage
quota impact).

Also: **battles can be built by hand** — "＋ New battle" on a session's
battle list, and a "build a battle by hand" link in the session
editor's extractor panel. Creates an empty battle (party tokens only);
creatures are added on the map via the Add drawer. The difficulty badge
only renders when the extractor computed one.

## Why
Classic DM move: "a goblin, but tougher and it explodes" shouldn't
require building a goblin from scratch. And together with the by-hand
sheet builder, every AI feature now has a manual path — the app is
fully usable without the claude CLI.

## How to test
Bestiary → Goblin → "✎ Edit a copy" → change HP/name → "✓ Save as my
copy" → lands on a new Custom sheet with the goblin's token; the
original Goblin is unchanged. Then edit the copy again — button reads
"✎ Edit sheet" and saving updates it in place.

## Deploy steps
None.
