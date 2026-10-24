# Data Preparation for Claude Code

Operate one business's data preparation from exported source files. Read this file in every runtime. Use the CLI before answering about records. Demo data is fictional.

## House rules

- Never send, publish or call a source system. Drafts stay in drafts/.
- Migrate a clean database before importing. Never seed a customer database.
- A trusted operator runs the CLI. The base has no tenant isolation, staff login or production scheduling.
- Each write records --actor. Names are audit labels, not authenticated identities.
- Imports are immutable snapshots. Identical file bytes are skipped, not reactivated as the current batch.
- Never delete source records or history without explicit authorisation. Retention checks are review prompts.
- A missing or ambiguous record is a question, not permission to guess.
- Recipes run only documented operations. Never silently translate an Alteryx workflow file.
- Reconcile the imported count, each step count and totals before replacing the existing process.
- Keep imports, exports, drafts and reports out of Git. Do not share personal data with an agent unless the business permits that handling.

## One CLI

`npm run prep -- help` lists syntax. Every command accepts --json. References accept exact codes, partial UUIDs and case-insensitive names. Recipes use exact source codes.

| Job | Command options |
|---|---|
| /datasets | List datasets, owners, imported row counts and freshness. |
| /dataset | --ref=CODE Read dataset metadata and batch history. |
| /profile | --ref=CODE Count blanks, distinct values and decimal values. |
| /rows | --ref=CODE [--limit=25] Read the latest imported rows. |
| /add-dataset | --code=CODE --name=Name --owner=Name --purpose=Purpose [--personal=true --review=YYYY-MM-DD --jurisdiction=NZ --fresh-days=7] --actor=Name |
| /set-policy | --ref=CODE --owner=Name --purpose=Purpose --personal=true or false --review=YYYY-MM-DD --jurisdiction=NZ or AU or OTHER --actor=Name |
| /import | alteryx --file=export.csv --dataset=CODE --actor=Name [--dry-run] Import a complete UTF-8 comma-separated export with column headers. |
| /pipelines | List recipes and whether rules or inputs have changed since the last run. |
| /pipeline | --ref=CODE Read saved rules and their version. |
| /save-pipeline | --code=CODE --name=Name --owner=Name --file=recipe.json --actor=Name [--replace] Save explicit preparation steps. |
| /run | --ref=CODE --actor=Name Execute the current recipe. Failed validation records a failed run and exits 1. |
| /runs | [--ref=CODE] Read previous executions. |
| /result | --ref=RUN [--limit=25] Read saved output and source-row lineage. |
| /reconcile | --ref=RUN Read per-step input/output counts and source batch references. |
| /source-health | Read sources that are stale or have never arrived. |
| /attention | Read open review actions, oldest first. |
| /compliance | Read purpose, ownership, privacy review and freshness findings. Review support, not certification. |
| /weekly-review | Combine source health, run health, actions and compliance findings. |
| /add-action | --title=Task --owner=Name --due=YYYY-MM-DD --actor=Name |
| /close-action | --ref=ID-or-title --evidence=Reason --actor=Name |
| /audit | Read the latest 100 recorded operator actions. |
| /export | --ref=CODE-or-RUN --kind=dataset or run --file=path.json or path.csv [--format=json or csv] --actor=Name [--raw-csv] [--overwrite] |
| /draft-review | Render the weekly review to drafts/ as branded HTML. Never sends. |
| /customise | Implement and test a forward migration, then apply it with approval for the specific data change. |
| /new-view | Add a read-only query to views.json and render it. |

## Files

SQL migrations and seed are under supabase/. scripts/prep.mjs is the only domain CLI. scripts/lib/prepare.mjs defines the small recipe language. brand.json controls documents and read-only views. DATABASE_URL selects PostgreSQL, otherwise DATA_DIR selects an embedded PGlite database. Read docs/operations.md before production use.

Built and run through Omni by Enterprise DNA.
