# Fix migration ordering that broke fresh local installs

**Branch:** feature/fix-pcs-sheet-slug-migration · **Date:** 2026-07-21 · **Author:** Eris (+ Claude)

## What changed
Moved three `ALTER TABLE` migrations in `src/lib/server/db.ts` that ran
*before* the tables they target existed: `pcs.sheet_slug`, `pcs.bytes`,
and `songs.bytes`. Each now runs immediately after its table's
`CREATE TABLE IF NOT EXISTS`. No table schema, column, or data changed —
only the order migrations run in.

## Why
On a completely fresh database, `ALTER TABLE pcs ADD COLUMN sheet_slug`
ran before `pcs` was created, so it failed with "no such table" — an
error the surrounding `catch {}` (meant only to swallow "duplicate
column") silently absorbed. The `pcs`/`songs` `bytes` columns from the
per-user storage accounting loop had the same problem. Net effect: a
brand-new clone crashed on first login with `SqliteError: no such
column: p.sheet_slug`. Existing databases (including production) were
never affected, because by the time each of these lines was added to
the code, its target table already existed there, so the `ALTER`
succeeded normally — this fix only changes behavior for databases where
the table didn't exist yet.

## How to test
Delete (or rename aside) a local `data/nilbot.db`, run `npm run dev`,
create an account, and confirm the app's home page loads instead of a
500. Also confirmed `npm run check` still reports 0 errors.

## Deploy steps
None — production's `pcs` and `songs` tables already have these
columns, so this migration reorder is a no-op there.
