# DM Journal — OneNote-style reference pages

**Branch:** feature/dm-journal · **Date:** 2026-07-20 · **Author:** Denis (+ Claude)

## What changed
New "Journal" entry at the bottom of the sidebar (above Settings):
freeform markdown pages organized into sections (spells, pantheons,
lore, houserules — whatever the campaign needs). It's a OneNote-style
three-pane workspace on one screen: sections list → pages of the
chosen section → editor. Creating a section starts it with one blank
page. The editor autosaves as you type, has an edit/preview toggle
(same marked rendering as Sessions), and a section field (with
datalist) to move a page between sections. Deep links work via
`/journal?p=<id>`; old `/journal/<id>` URLs redirect. New
`journal_pages` table, per-user scoped.

## Why
The one thing OneNote still had over NilBot for a fellow DM: a place to
keep arbitrary reference pages that aren't session prep. Sessions are
for prep and battle extraction; the Journal is the campaign's
encyclopedia.

## How to test
Sidebar → Journal → ＋ New section → the blank page opens selected;
title it, write markdown, watch "✓ saved", flip Preview. ＋ in the
pages pane adds a sibling; clicking sections/pages switches without
leaving the screen; the Section field moves a page. Delete via ✕ on a
hovered page row.

## Deploy steps
None. (Table is created automatically at boot.)
