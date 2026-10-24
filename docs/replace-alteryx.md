# Bring an Alteryx data export across

Checked 24 October 2026. Alteryx's [Output Data documentation](https://help.alteryx.com/aac/en/designer-experience/designer-cloud-tool-list/cloud-native-mode-tools/workflow-in-out-tools/output-data-tool.html) describes CSV output, delimiter selection and including column names as the first row.

1. Keep the existing process running. Identify each input or finished dataset that the replacement job needs. Record the source count and a control total. Export the complete result rather than a preview.
2. In the Output Data tool choose CSV, comma as delimiter and column names in the first row. Use UTF-8. Save the file locally. In Desktop use its Output Data tool to produce the same format. Do not rename .yxdb to .csv.
3. Run migrate on an empty destination database. Register a dataset with add-dataset and its accountable owner and purpose. Use set-policy for personal-data scope, jurisdiction and a review date chosen by the business.
4. Run npm run prep -- import alteryx --dataset=CODE --file=imports/export.csv --actor=Operator --dry-run. Compare row_count and columns with the source.
5. Repeat without --dry-run. One command saves a complete immutable snapshot. Review dataset and profile, save a recipe and reconcile its result against the old process.

## Mapping

Column names remain names. Values remain text, including leading zeroes. Duplicate column names, malformed quotes, uneven rows and invalid UTF-8 fail before any writes. Blank physical lines are ignored; multi-column rows with empty values remain records. Embedded newlines, quoted commas, BOM and CRLF work. Duplicate records are retained until the recipe explicitly deduplicates them.

An identical file is skipped. A changed file becomes a new full snapshot; it does not append history to the preceding snapshot. Previous batches stay available for run evidence. Reimporting old bytes does not make that batch current. To combine periods, import a complete combined export as a new batch.

No source file from a real customer was used during this build. The automated fixture is synthetic and follows the documented CSV options. Reconcile an actual export before switching.

## What needs separate mapping

Alteryx workflow files, formulas, macros, scheduling, credentials, connection settings, spatial and predictive models do not migrate. Build each required preparation job with the documented operations and compare the output. Save the recipe using save-pipeline. Changing existing rules requires --replace and retains old run versions.

The base makes local files only. Enterprise DNA can implement the additional connections and operating controls your agreed replacement needs.

## Take your records out

Use export with --kind=dataset or --kind=run, --ref, --file and --actor. JSON keeps exact values plus snapshot metadata. CSV has headers and defaults to prefixes that prevent leading formula characters from being interpreted by spreadsheet software. --raw-csv preserves exact strings for trusted machine consumers. A PostgreSQL dump, or a stopped embedded database copy, retains all historical batches and audit records. The export command exports one selected current dataset or saved run, not a full backup.
