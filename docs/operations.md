# Operate and recover

Use one trusted operator and one business per database. For local use, keep .data/ on a private volume. For PostgreSQL use a dedicated database owner connection with TLS outside localhost. Public roles receive no table access. This is not tenant isolation or an authenticated staff application.

Run npm run migrate on an empty database, register sources, import and reconcile. Do not seed production. Run weekly-review and inspect failed or outdated runs before exporting. fresh_days and retention_review are business policy inputs.

The entire CSV and result are loaded in memory. Start with a small authorised sample, reconcile it and test the full workload on the intended host. No throughput or memory limit is promised. Do not run concurrent embedded database processes. PostgreSQL preparation runs use a repeatable snapshot so each run records consistent batch references.

Back up embedded storage only after closing every process. Copy the whole .data/db folder to encrypted storage. For PostgreSQL use pg_dump and your hosting provider's backup policy. Test restoring to a separate database, run migrate, check datasets, runs and record counts, then render a reconciliation document. Do not replace the working database as a restore test.

CSV export uses spreadsheet-safe prefixes. JSON preserves exact text. Import/export paths are explicit local operator choices. Exports refuse to overwrite by default. A write to a local export file is not transactional with its audit insert; if audit fails, inspect the file before retrying. Generated HTML is private business output, even though it is read-only.

Tests use a fresh temporary embedded database. TEST_DATABASE_URL is only for an explicitly disposable PostgreSQL test database. Never point it at business data. The same test program uses portable paths and Node subprocesses. CI defines Windows/Linux Node 20/22 and PostgreSQL checks, but only an actual passing run verifies those environments.
