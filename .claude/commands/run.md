---
description: run
---
# /run

Read CLAUDE.md. Run `npm run prep -- run --json` with the required options below. Use the actual output to answer.

--ref=CODE --actor=Name Execute the current recipe. Failed validation records a failed run and exits 1.

Name the operator with --actor. Read the existing record first. Do not guess missing fields.

A failed run exits 1 and still saves its error. Read reconcile and the source rows. Fix the source or recipe, then run again. Never present earlier successful results as current after inputs change.
