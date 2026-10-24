---
description: Bring across an Alteryx CSV export
---
# /import

Read CLAUDE.md. Run `npm run prep -- import --json` with the required options below. Use the actual output to answer.

alteryx --file=export.csv --dataset=CODE --actor=Name [--dry-run] Import a complete UTF-8 comma-separated export with column headers.

Name the operator with --actor. Read the existing record first. Do not guess missing fields.

Use --dry-run first. Record the source export count, compare it with row_count and inspect column names. Import only after the counts agree. The importer reads data exports, not saved Alteryx workflows.
