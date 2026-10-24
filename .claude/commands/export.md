---
description: export
---
# /export

Read CLAUDE.md. Run `npm run prep -- export --json` with the required options below. Use the actual output to answer.

--ref=CODE-or-RUN --kind=dataset|run --file=path.json|path.csv [--format=json|csv] --actor=Name [--raw-csv] [--overwrite]

Name the operator with --actor. Read the existing record first. Do not guess missing fields.

Use JSON for unchanged machine-readable values. CSV defaults to spreadsheet-safe prefixes. --raw-csv preserves exact strings and requires the operator to understand formula interpretation. Never overwrite without an explicit request.
