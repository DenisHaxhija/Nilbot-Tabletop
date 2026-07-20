# NilBot — read this before touching the repo

NilBot is a self-hosted D&D DM workbench (SvelteKit + Svelte 5 runes,
better-sqlite3, TypeScript). This file covers the two things every
contributor (and their Claude) must know: **repo rules** and **running locally**.

---

## 1. Repo rules

### Branch model

| Branch | Purpose | Rules |
|---|---|---|
| `main` | Integration — where features land | PRs preferred; keep it building |
| `live` | **Production. Protected.** | **Never push directly.** Only merged into via PR from `main`. Every merge auto-deploys to the production server via GitHub Actions (`.github/workflows/deploy.yml`) |
| `feat/*` | Your work | Branch from `main`, test locally, PR into `main` |

The flow: **build on a feature branch → test locally → PR into `main` →
when a feature is ready for the table, PR `main` → `live`** — the pipeline
deploys it. Nothing reaches players except through `live`.

### Hard rules (breaking these breaks the project)

1. **Licensing / data layers.** The repo and Docker image contain ONLY
   freely-licensed data (Open5e SRD/CC). Everything a user imports
   (5e.tools stat blocks, token art, map images, music) lives in `data/`,
   which is gitignored and volume-mounted. Never commit `data/`, never add
   copyrighted content to the repo. This keeps the app distributable.
2. **Per-user scoping.** Every query on notes/battles/maps/characters/pcs/
   songs/quick_notes/shop_stock filters by `locals.user!.id`. Monsters and
   items use the shared-layer pattern `(user_id IS NULL OR user_id = ?)`.
   The first account created claims all unowned rows (`createUser` in
   `src/lib/server/auth.ts`).
3. **LLM calls go through one seam** — `src/lib/server/encounter.ts` and
   `src/lib/server/builder.ts` (spawn `claude -p`). Never add LLM calls
   elsewhere; parse output defensively.
4. **`npm run check` must report 0 errors** before a PR is ready.
5. **Never blanket-delete from shared tables** (users, monsters, maps…) in
   tests/cleanup — scope deletes to exactly the rows you created.
6. **Presentation views (`/present/...`) are player-safe**: no HP numbers,
   no DM notes, no stat blocks. They use the bare layout and live-update via
   SSE endpoints.

### Conventions

- Svelte 5 runes only (`$state`, `$derived`, `$props`) — no legacy `$:`.
- `confirmDialog()` from `$lib/confirm.svelte`, never native `confirm()`.
- Media is served through authenticated `/api/...` endpoints reading `data/`,
  never from `static/`.
- New top-level pages get a `<svelte:head><title>`, a sidebar entry in
  `+layout.svelte`, and empty states.
- Importer scripts (`scripts/*.mjs`) must stay idempotent (upsert by slug /
  skip by src) and take `--user <name>` when content belongs to an account.

---

## 2. Running locally

```sh
# once
nvm install 22 && nvm use 22
npm install
npm approve-scripts better-sqlite3 && npm rebuild better-sqlite3  # native module
node scripts/import-open5e.mjs        # shared bestiary (~3,200 monsters)
node scripts/import-open5e-items.mjs  # shared item catalog (~1,600 items)

# every day
npm run dev                           # http://localhost:5173
```

- First visit shows account creation — **your first local account claims all
  local data**. Your local `data/` is yours alone; production has its own.
- Optional personal-use imports: `import-2mt-maps.mjs` and
  `import-dicegrimorium.mjs` (battle maps), `import-5etools.mjs <file>`
  (stat blocks you own), `import-5etools-tokens.mjs <dir>` (token art),
  `retag-maps.mjs` (re-run terrain tagging).
- AI features (Battle Extractor, Sheet Builder) require the `claude` CLI
  installed and logged in on your machine; everything else works without it.
- Verify before PR: `npm run check` (0 errors) and click through what you
  changed in the browser.

### Production (context only — don't touch without Denis)

`live` deploys automatically to the production server (Docker + Caddy +
systemd, domain nilbot.duckdns.org). Server access and secrets are handled
by Denis outside the repo. The production `data/` volume is the single
source of truth for real campaign data — no script or pipeline may overwrite
or delete it.
