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

Baked Custom sheets are re-editable: an "✎ Edit sheet" button on your
own sheets in the bestiary opens them back in the Sheet Builder
(`/builder?edit=<slug>`). From there both paths work — keep refining in
AI chat, or flip on "✎ Edit by hand" for a structured form (all
scalars, ability scores, speed/skills as "walk 30, fly 60"-style text,
and add/remove/edit for special abilities, actions, bonus actions,
reactions and legendary actions). Saving updates the sheet in place —
the slug never changes, so character/PC links and battle tokens keep
pointing at it; a new token image replaces the old one with correct
storage accounting.

Spoiler protection for the Characters section:
- **Hidden groups**: the 🙈 toggle on a group card moves it into a
  collapsed "hidden groups" bar at the bottom of the Characters index —
  nothing about it is visible until the bar is clicked open. Works for
  implicit (folder-only) groups too; `char_groups.hidden`.
- **Hidden names**: the 🎭 toggle on a character card masks them on the
  player-facing canvas — name shows as "???" and the title is dropped.
  Masking happens server-side (canvas load + SSE stream), so the real
  name never reaches the player view. `characters.hide_name`.

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
rule 6). Spoilers: hover a group card → 🙈 to hide it, then find it in
the collapsed bar at the bottom; 🎭 on a character card, send them to
canvas, and the canvas shows "???". Re-editing: Bestiary → one of your
Custom sheets → ✎ Edit sheet → change something by hand or in chat →
Save changes → the sheet page shows the revision.

## Deploy steps
None. (Column is added automatically at boot.)
