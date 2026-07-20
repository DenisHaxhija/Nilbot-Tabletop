# Changelog

One file per feature branch, written when the branch is ready for PR
(not per work session). Name it `YYYY-MM-DD-<branch-topic>.md` with the
date the entry is written.

Why a folder and not one CHANGELOG.md: parallel feature branches would
conflict on every merge if they all edited the same file. Separate files
never conflict.

Template — keep it to half a page:

```markdown
# <Feature title>

**Branch:** feat/<name> · **Date:** YYYY-MM-DD · **Author:** <who> (+ Claude)

## What changed
Two or three sentences, plain language.

## Why
The problem this solves, and any approaches that were tried and
rejected (so nobody re-proposes them).

## How to test
Steps a teammate can click through locally.

## Deploy steps
Anything that must happen on the server beyond the pipeline
(migrations, scripts to run, env vars). Write "None" if none —
don't leave it out.
```
