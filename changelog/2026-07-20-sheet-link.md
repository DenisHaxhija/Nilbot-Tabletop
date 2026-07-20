# Link stat sheets to characters

**Branch:** feature/sheet-link · **Date:** 2026-07-20 · **Author:** Denis (+ Claude)

## What changed
A character can now link one stat sheet from the bestiary (including
Custom sheets from the builder). The character editor gets a "Stat
sheet" search picker; linked characters show a 📜 button on their card
that opens the full stat block in a slide-over. `characters.sheet_slug`
references `monsters.slug`, validated against the user's visible layer
on save; invalid slugs are ignored, empty means unlink.

Sheets also reach battles, two ways:
- **NPCs are placeable**: the battle's Add drawer gains a "Your
  characters" section (filtered by the same search box). Placed NPCs
  use their portrait as the token (violet ring, new token kind `npc`),
  prefill HP/initiative from the linked sheet, and auto-roll initiative
  with monsters.
- **PC tokens**: party members can link a sheet too (＋📜 on the
  dashboard party panel, PATCH `/api/pcs/[id]`).
Clicking any token with a linked sheet in a battle opens the stat block,
same as enemies. Links are re-read from the DB on every battle load, so
relinking after a layout was saved still takes effect.

## Why
NPCs that can fight (rivals, bosses, allies) lived in two places —
their lore in Characters, their numbers in the bestiary — with no
connection. Now the sheet is one click from the character card
mid-session.

## How to test
Characters → any group → edit a character → search "archmage" (or a
Custom sheet) in the Stat sheet field → save. The card shows 📜; click
it for the stat block. Unlink via ✕ in the editor. In a battle: ＋ Add
creature → pick someone under "Your characters" → click their token.
Dashboard → party panel → ＋📜 on a PC → link → click their blue token
in a battle. Present views are unchanged — sheets are DM-only (hard
rule 6).

## Deploy steps
None. (Column is added automatically at boot.)
