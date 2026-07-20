# NilBot — project context for Claude

NilBot is a self-hosted D&D DM workbench: session notes with AI battle extraction,
a 3,200-monster bestiary, battle maps with tokens/initiative/HP, live TV
presentation views, character galleries, a magic-item shop, world maps, and music
playlists. Single Node process, SQLite, multi-account.

**Stack:** SvelteKit (Svelte 5 runes syntax) · better-sqlite3 · TypeScript.
No ORM, no CSS framework — hand-rolled dark theme in `+layout.svelte` (green
accent `--accent`, ember `--accent-2`, serif headings, Cinzel for the brand).

## Hard rules — do not break these

1. **Licensing / data layers.** The repo and Docker image must contain ONLY
   freely-licensed data (Open5e SRD/CC monsters & items, generated content).
   Everything a user imports (5e.tools stat blocks, token art, map images,
   music) lives in `data/` — which is gitignored and volume-mounted, never
   bundled. Never commit `data/`, never add copyrighted content to the repo.
2. **Per-user scoping.** Every query on notes/battles/maps/characters/pcs/
   songs/quick_notes/shop_stock MUST filter by `locals.user!.id`. Monsters and
   items use the shared-layer pattern: `(user_id IS NULL OR user_id = ?)` —
   NULL = shared base layer visible to all accounts. The FIRST account created
   claims all unowned rows (see `createUser` in `src/lib/server/auth.ts`).
3. **LLM calls go through one seam.** All AI features call the `claude` CLI
   (`claude -p ... --output-format json`) via `src/lib/server/encounter.ts` and
   `src/lib/server/builder.ts`. Never scatter LLM calls elsewhere; the seam
   exists so we can swap CLI → API key someday. LLM output parsing must be
   defensive (strip fences, slice to outer braces/brackets).
4. **Never blanket-delete from shared tables** (users, monsters, maps…) in
   tests or cleanup — scope deletes to exactly the rows you created.
5. **Typecheck is the gate:** `npm run check` must report 0 errors before any
   change is considered done.

## Architecture map

- `src/hooks.server.ts` — auth gate: session cookie → `locals.user`; all pages
  redirect to /login, all /api/* return 401 when unauthenticated.
- `src/lib/server/db.ts` — SQLite schema (idempotent CREATE/ALTER migrations at
  import time), monster search (FTS5), settings helpers. Single DB at
  `data/nilbot.db`, WAL mode.
- `src/lib/server/auth.ts` — scrypt passwords, 30-day session tokens,
  first-account-claims-all.
- `src/lib/server/encounter.ts` — battle extraction from notes + DMG XP math.
- `src/lib/server/builder.ts` — AI custom stat-block generation.
- `src/lib/tags.ts` + `scripts/lib.mjs` — terrain-tag vocabulary (KEEP IN SYNC,
  word-boundary matching).
- Routes: `notes` (sessions + quick notes), `battles/[noteId]/[battleId]`
  (map builder: tokens, drag, initiative/HP tracker, edit mode),
  `present/*` (player-facing TV views — bare layout, no DM data),
  `bestiary`, `builder` (sheet builder), `characters/[group]`, `maps`,
  `worldmaps`, `shop`, `music`, `settings`, `login`.
- Live sync: TV views subscribe to SSE endpoints (`/api/battles/[id]/stream`,
  `/api/canvas/stream`, `/api/shop/stream`) — server polls SQLite every
  250–500ms and pushes on change. DM-side edits persist via PUT; drags stream
  mid-gesture (throttled ~300ms).
- `scripts/*.mjs` — data importers (Open5e monsters/items, 2-Minute Tabletop +
  Dice Grimorium maps, 5e.tools stat blocks/tokens, retagger). Importers take
  `--user <name>` when multiple accounts exist; they must stay idempotent
  (upsert by slug / skip by src).

## Conventions

- Svelte 5 runes only (`$state`, `$derived`, `$props`); no legacy `$:` syntax.
- Use `confirmDialog()` from `$lib/confirm.svelte` — never native `confirm()`.
- Presentation (`/present/...`) pages are player-safe: no HP numbers, no DM
  notes, no stat blocks; bare layout (see the `bare` check in `+layout.svelte`).
- Images/audio are served through authenticated API endpoints reading from
  `data/` — never from `static/`.
- Every destructive UI action gets a confirm dialog; every list gets an empty
  state; every new page gets a `<svelte:head><title>` and a sidebar entry if
  it's a top-level tab.

## Dev setup (fresh clone)

```sh
nvm use 22 || nvm install 22
npm install
npm approve-scripts better-sqlite3 && npm rebuild better-sqlite3  # native module
node scripts/import-open5e.mjs        # shared bestiary (~3,200 monsters)
node scripts/import-open5e-items.mjs  # shared item catalog (~1,600 items)
npm run dev                           # first visit creates YOUR account
```

Optional local data (personal use only): `import-2mt-maps.mjs`,
`import-dicegrimorium.mjs` (battle maps), `import-5etools.mjs <file>` (your
stat blocks), `import-5etools-tokens.mjs <tokens dir>` (token art).
AI features need the `claude` CLI installed and logged in.

## Production

There is a live deployment (Docker + Caddy + systemd on a small cloud server,
domain `nilbot.duckdns.org`). Deploy access, server details, and upgrade
procedure are Denis's to share — coordinate with him before touching prod.
Upgrade flow: rsync source → `docker compose build` → `systemctl restart nilbot`.
The production `data/` volume is the single source of truth for user data —
never overwrite it with a local copy.

## Roadmap / open threads (check with Denis before starting)

- OneNote campaign import (pipeline exists: `scripts/fetch-onenote.mjs` +
  `scripts/import-onenote.mjs`; blocked on Microsoft login, currently parked).
- Possible future: commercialization (~$5 one-time) — the licensing rules above
  exist so the app stays sellable; keep it that way.
- Sub-100ms battle sync (SSE → WebSockets) if polling ever feels laggy.
- Bought domain to replace DuckDNS (Caddy config is the only change).
