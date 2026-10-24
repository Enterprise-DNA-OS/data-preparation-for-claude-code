---
description: set policy
---
# /set-policy

Read CLAUDE.md. Run `npm run prep -- set-policy --json` with the required options below. Use the actual output to answer.

--ref=CODE --owner=Name --purpose=Purpose --personal=true|false --review=YYYY-MM-DD --jurisdiction=NZ|AU|OTHER --actor=Name

Name the operator with --actor. Read the existing record first. Do not guess missing fields.

Ambiguous names list candidates and exit 1. Ask which record the operator means.
