# DM Journal — OneNote-style reference pages

**Branch:** feature/dm-journal · **Date:** 2026-07-20 · **Author:** Denis (+ Claude)

## What changed
New "Journal" entry grouped with Settings at the bottom of the sidebar.
It's a OneNote-style three-pane workspace: colored sections → pages of
the chosen section → the page itself. Unlike Sessions (markdown), the
journal page is WYSIWYG — a contenteditable canvas with a formatting
toolbar (headings, bold/italic/underline/strike, highlight, lists,
divider, clear formatting); you type and it's formatted, no preview
toggle, and pasting from OneNote keeps the formatting. Sections have
stable colors, hover ✎ rename and ✕ delete; pages support one level of
OneNote-style subpages (hover → to indent under the page above, ← to
promote; deleting a parent promotes its subpages). Autosaves as you
type. Deep links via `/journal?p=<id>`; old `/journal/<id>` URLs
redirect. New `journal_pages` table (`parent_id` for subpages),
per-user scoped. Content is stored as HTML.

## Why
The one thing OneNote still had over NilBot for a fellow DM: a place to
keep arbitrary reference pages that aren't session prep. Sessions are
for prep and battle extraction; the Journal is the campaign's
encyclopedia.

## How to test
Sidebar → Journal (bottom, above Settings) → ＋ Section → the blank
page opens; title it, type formatted text with the toolbar, watch the
✓. ＋ Page adds siblings; hover a page row → "→" makes it a subpage,
"←" promotes it back; hover a section → ✎ rename, ✕ delete. Paste
something from real OneNote and check the formatting survives.

## Deploy steps
None. (Table is created automatically at boot.)
