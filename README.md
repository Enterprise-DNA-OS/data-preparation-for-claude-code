# Data Preparation for Claude Code

Repeat the weekly preparation job, keep the original files and show how each answer was made. A database, a small CLI and Claude Code, Codex, OpenCode or Cursor. Free, MIT licensed.

| Do it yourself | We customise it | We run it for you |
|---|---|---|
| Clone, install, import and own it. | Your fields, rules, agreed Alteryx exports and connections. | Installed and operated through Omni by Enterprise DNA. |
| [Quick start](#quick-start) | [Get your version built](https://enterprisedna.co/omni/book/?offer=replace-software&utm_source=github&utm_medium=readme&utm_campaign=alteryx) | [One setup fee, then a retainer](https://enterprisedna.co/omni/book/?offer=replace-software&utm_source=github&utm_medium=readme&utm_campaign=alteryx) |

Alteryx Starter lists US$250 per user per month billed annually. Ten seats imply US$30,000 a year before other costs. This is a list-price scenario, not a customer invoice. Professional and Enterprise use private quotes. [Vendor pricing](https://www.alteryx.com/platform/pricing), checked 24 October 2026.

## Quick start

Requires Node 20 or later.

```bash
git clone https://github.com/Enterprise-DNA-OS/data-preparation-for-claude-code.git
cd data-preparation-for-claude-code
npm install
npm test
npm run demo
npm run view
npm run docs
```

The demo has five fictional order rows, one exact duplicate, a cancelled order, a stale branch lookup and a branch with no region. TOTALS passes. REGIONS deliberately fails its required-region check. The demo command exits successfully after demonstrating both paths. A direct failed run exits 1.

Use /weekly-review first. Set your name and colours in brand.json. To use PostgreSQL, set DATABASE_URL in your environment and run npm run migrate. Start production from an empty database and never run seed or demo there.

## What it does

Import a complete CSV output from Alteryx. Preserve every field as text, each file hash and every batch. Define repeatable trimming, case conversion, field selection, renaming, equality filtering, exact deduplication, left lookups, grouped decimal sums and required or unique-field checks. Save the recipe and run it against the latest source snapshots.

Duplicate lookup keys fail. Duplicate preparation keys with different record values fail. Exact duplicates combine their source references. Decimal sums use fixed-point arithmetic with up to six decimal places, not floating-point money calculations. Each successful output carries the source-row references that contributed to it. Each run saves its recipe version and batch references. Changing an input flags the old run as outdated without changing its saved answer.

This covers file-based data preparation. It is not an interpreter for Alteryx .yxmd, .yxzp or cloud recipe files. Saved workflows, macros, spatial models, schedules and connections need separate implementation and reconciliation. Alteryx already provides data preparation and analytics. These questions show this build's working commands, not an unsupported claim that the vendor cannot answer them.

## Ten questions this build answers

1. Which source has stopped arriving? /source-health.
2. How many blanks and distinct values are in each column? /profile.
3. Which weekly preparation run failed, and why? /runs.
4. Did a new source file make last week's answer outdated? /pipelines.
5. How many rows did filtering and deduplication remove? /reconcile.
6. Which original rows contributed to this branch total? /result.
7. What recipe and source snapshot produced an old answer? /reconcile.
8. Who imported a file or changed a rule? /audit.
9. Which personal data needs a purpose or retention review? /compliance.
10. Who owns the overdue mapping check? /attention.

## Weekly work

Check /source-health, inspect /profile, /run the saved recipe, /reconcile the result and write /draft-review. /weekly-review combines source freshness, run status, overdue actions and privacy findings. /add-action and /close-action retain ownership and evidence. Nothing sends or changes a vendor system.

`npm run prep -- help` lists all 24 commands. Every command supports --json. Reads resolve exact codes, partial UUIDs and case-insensitive names. Ambiguous references list candidates and exit 1.

## Bring your history

[Export and switching guide](docs/replace-alteryx.md). Once a dataset is registered, one command imports its Alteryx CSV export. Repeated bytes are skipped. Changed files create a new full snapshot, not an append or automatic merge.

```bash
npm run prep -- add-dataset --code=IMPORT --name="Order history" --owner="Data owner" --purpose="Branch reporting" --actor="Operator"
npm run prep -- import alteryx --dataset=IMPORT --file=imports/orders.csv --actor="Operator" --dry-run
npm run prep -- import alteryx --dataset=IMPORT --file=imports/orders.csv --actor="Operator"
npm run prep -- save-pipeline --code=CHECK --name="Branch totals" --owner="Data owner" --file=test/fixtures/branch-totals.json --actor="Operator"
npm run prep -- run --ref=CHECK --actor="Operator"
```

The fixture and recipe use fictional records. Map your fields explicitly before relying on the result. A switch in a day means importing an agreed export and validating an agreed preparation job. It does not promise automatic conversion of every vendor workflow.

## Documents and views

`npm run docs` makes a source purpose and retention register plus a reconciliation document for each run. `npm run view` makes a weekly dashboard and run history. These are branded, escaped, read-only HTML files with print styles. They contain business data and stay local unless an operator shares them. /new-view extends the existing renderer.

## Your first hour: ten things to ask for

1. Put our name and logo on the reconciliation document.
2. Import one source export as a test run.
3. Check its count against Alteryx's full output.
4. Find blank branch codes.
5. Save our exact deduplication rule.
6. Check that lookup keys identify one branch each.
7. Trace a total back to its source rows.
8. Assign the missing mapping to its owner.
9. Record our personal-data retention review date.
10. Add our approval reference with a tested forward migration.

/customise implements changes against temporary data first. [Why no front end](docs/why-no-front-end.md).

## Operating boundaries

Files and preparation results load in memory. This is a modest-volume, trusted-operator tool, not a distributed engine. There are no live connectors, background schedules, mobile editing or multiuser permissions. Enterprise DNA scopes connections, access controls, a web front end or another stack in your custom version. Hosting and agent usage have their own costs.

[Operations and backups](docs/operations.md) · [Privacy checks and sources](docs/compliance.md) · [Selection research](docs/research.md).

MIT. Not affiliated with Alteryx or Anthropic.
