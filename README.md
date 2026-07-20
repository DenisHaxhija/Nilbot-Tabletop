# NilBot

A personal D&D DM assistant: session notes, a full local bestiary, name generators, and an LLM encounter builder — all in one local web app.

## Running it

```sh
npm run dev        # then open http://localhost:5173
```

Requires Node.js (installed via nvm) and, for encounter suggestions, the `claude` CLI logged in to your Claude subscription.

## Features

- **Session Notes** — markdown notes with live preview and autosave, stored in SQLite.
- **Bestiary** — 3,200+ monsters (SRD + CC-licensed content from Open5e) with full-text search, CR/type/size/source filters, and rendered stat blocks.
- **Encounter Builder** — from any note, click *Suggest encounters*: Claude reads your session text, proposes encounters, the app matches every creature against your local bestiary and computes XP budgets/difficulty (DMG rules) deterministically.
- **Name Generator** — characters by ancestry, taverns, settlements.

## Importing more monsters

The app ships with only freely-licensed data. To add content you own, obtain it as
5e.tools-format bestiary JSON and import it locally:

```sh
node scripts/import-5etools.mjs path/to/bestiary-file.json
```

Re-running either importer is safe (upserts by slug). To refresh the Open5e layer:

```sh
node scripts/import-open5e.mjs
```

> **Licensing note:** the `data/` directory (your database) is gitignored on purpose.
> Never commit or distribute imported copyrighted content with the app.

## Architecture

- SvelteKit (Svelte 5) + better-sqlite3, single database at `data/nilbot.db`
- Monsters: raw JSON in a column + indexed columns (name/CR/type/size/source) + FTS5
- Two data layers: `open5e` (bundled-able) and `user` (imported, never distributed)
- LLM calls go through `src/lib/server/encounter.ts` → `claude -p` (subscription auth);
  swap that one function to use an API key if the app is ever distributed
