# DM Journal — OneNote-style reference pages

**Branch:** feature/dm-journal · **Date:** 2026-07-20 · **Author:** Denis (+ Claude)

## What changed
New "Journal" section in the sidebar: freeform markdown pages organized
into sections (spells, pantheons, lore, houserules — whatever the
campaign needs). The index shows sections as cards with their page
lists and a filter box; creating a section starts it with one blank
page, OneNote-style. The page editor has autosave-as-you-type, an
edit/preview toggle (same marked rendering as Sessions), and a left
rail listing the section's pages for quick hopping, plus a section
field (with datalist) to move a page between sections. New
`journal_pages` table, per-user scoped.

## Why
The one thing OneNote still had over NilBot for a fellow DM: a place to
keep arbitrary reference pages that aren't session prep. Sessions are
for prep and battle extraction; the Journal is the campaign's
encyclopedia.

## How to test
Sidebar → Journal → create a section → the blank page opens; title it,
write markdown, watch "✓ saved", flip Preview. ＋ page in the rail adds
a sibling; changing the Section field moves the page. Delete from the
editor or the index (hover a page row).

## Deploy steps
None. (Table is created automatically at boot.)
