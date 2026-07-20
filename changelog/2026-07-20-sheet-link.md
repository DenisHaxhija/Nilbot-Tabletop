# Link stat sheets to characters

**Branch:** feature/sheet-link · **Date:** 2026-07-20 · **Author:** Denis (+ Claude)

## What changed
A character can now link one stat sheet from the bestiary (including
Custom sheets from the builder). The character editor gets a "Stat
sheet" search picker; linked characters show a 📜 button on their card
that opens the full stat block in a slide-over. `characters.sheet_slug`
references `monsters.slug`, validated against the user's visible layer
on save; invalid slugs are ignored, empty means unlink.

## Why
NPCs that can fight (rivals, bosses, allies) lived in two places —
their lore in Characters, their numbers in the bestiary — with no
connection. Now the sheet is one click from the character card
mid-session.

## How to test
Characters → any group → edit a character → search "archmage" (or a
Custom sheet) in the Stat sheet field → save. The card shows 📜; click
it for the stat block. Unlink via ✕ in the editor. Present views are
unchanged — the sheet is DM-only (hard rule 6).

## Deploy steps
None. (Column is added automatically at boot.)
