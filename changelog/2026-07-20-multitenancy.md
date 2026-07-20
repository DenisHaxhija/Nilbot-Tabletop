# Per-user storage adapter, WebP compression, storage quotas

**Branch:** feature/multitenancy · **Date:** 2026-07-20 · **Author:** Denis (+ Claude)

## What changed
All user files (battle/world maps, PC and character portraits, music,
custom monster tokens) now go through one storage seam,
`src/lib/server/storage.ts`, stored under per-user keys
(`u<userId>/<area>/<id><ext>`) in `data/store/`. Image uploads are
re-encoded as WebP (quality 82, kept only if smaller). Every user has a
storage quota (default 4 GB, `STORAGE_CAP_MB` env, per-user override in
`users.storage_cap_mb`); usage is tracked in `users.storage_bytes` and
shown as a bar in Settings. The adapter also supports any S3-compatible
bucket via `STORAGE_BACKEND=s3` + `S3_*` env — not enabled anywhere yet.

## Why
Per-user imports meant every new DM account could add gigabytes of
duplicate files, which is too costly to host. Two approaches were tried
and rejected: a shared-visibility map layer (imported 2MT/DG maps are
personal-use licensed — can't be shown to other accounts) and a
content-addressed blob store (too convoluted). Compression + quotas
keeps everything strictly per-user and cuts real cost: the existing map
library shrank ~740 MB (over 70%).

## How to test
`node scripts/migrate-user-storage.mjs --dry-run`, then run it for real
(it moves data/maps, data/pcs, data/characters, data/music into
data/store and rewrites the DB). Then: browse Maps (images still load),
upload a map (lands as WebP, Settings → Storage bar moves), delete it
(usage goes back down). Set `storage_cap_mb` low on your users row to
see the quota rejection.

## Deploy steps
After this reaches `live`, run once on the server from /opt/nilbot:
`docker compose exec nilbot node scripts/migrate-user-storage.mjs`
(safe to re-run; supports --dry-run). Back up `data/nilbot.db` first.
