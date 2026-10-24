---
description: add dataset
---
# /add-dataset

Read CLAUDE.md. Run `npm run prep -- add-dataset --json` with the required options below. Use the actual output to answer.

--code=CODE --name=Name --owner=Name --purpose=Purpose [--personal=true --review=YYYY-MM-DD --jurisdiction=NZ --fresh-days=7] --actor=Name

Name the operator with --actor. Read the existing record first. Do not guess missing fields.

Ambiguous names list candidates and exit 1. Ask which record the operator means.
