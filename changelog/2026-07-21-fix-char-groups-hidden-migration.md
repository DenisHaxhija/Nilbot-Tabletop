# Fix the last migration-order bug: char_groups.hidden

**Branch:** feature/fix-char-groups-hidden-migration · **Date:** 2026-07-21 · **Author:** Denis (+ Claude)

## What changed
Moved the `char_groups.hidden` ALTER after `char_groups` is created —
the same ordering-bug class PR #2 fixed for `pcs.sheet_slug` and the
`bytes` columns, on the one column that fix didn't cover. A full audit
of all 16 ALTERs in `db.ts` confirms every one now runs after its
table's CREATE.

## Why
On a fresh database the ALTER ran before the table existed, the
`catch {}` swallowed the error, and the Characters page 500'd with
"no such column: hidden". Existing databases (including production)
already have the column, so they were never affected.

## How to test
Fresh-install test on an isolated worktree with an empty DB: created
the first account and loaded every top-level page — all 15 return 200
(the Characters page was the one that previously crashed).

## Deploy steps
None — no-op on production, which already has the column.
