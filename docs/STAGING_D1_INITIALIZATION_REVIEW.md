# Task 3C.2E — Staging D1 initialization readiness

Task 3C.2F supersedes the historical guard limitations/no-op rerun and raw execution drafts below: [D1_INITIALIZATION_SAFETY.md](D1_INITIALIZATION_SAFETY.md). Read-only whole-schema/account/UUID/binding preflight and SQL assertions now reject unexpected schema/occupied targets. Local tests pass; actual provider identity/schema and real initialization remain NOT_VERIFIED/NOT_RUN. The original Task 3C.2E findings below are retained as historical evidence, not current execution instructions.

Date: 2026-11-01. Branch dev/smartfleet-batch-1. **NOT_READY for remote initialization.** Local review/rehearsal only; no Cloudflare, SQL on real databases, deployment, secrets, resources or schema changes performed.

## Reviewed targets and inputs

Read AGENTS.md and the prior roadmap/architecture/progress/test-plan/Staging preparation context. Reviewed current FIRST_STAGING_DEPLOYMENT.md, STAGING_READINESS.md, both initialization SQL scripts, staging.test.mjs, storage.ts and environment.ts.

| Target | Binding / configuration | Expected UUID |
| --- | --- | --- |
| smart-fleet-staging-db | DEMO_DB, config/staging-no-r2.example.jsonc | f71ba325-027c-4b3f-abb2-71492493a8cf |
| smart-fleet-recovery-db | RECOVERY_DB, config/recovery-d1.example.jsonc; not app-bound | 5ec99f9c-4919-41f4-9bc4-c8c564a60296 |

Exact names/UUIDs match the user-supplied configuration. Existing staging suite verifies UUID separation from each other and configured Production without a live Production call. Live account ownership, D1 existence/UUID mappings, schema and occupancy remain NOT_VERIFIED after Task 3C.2C browser access timeout. No inference that databases are missing or empty. R2/cron/public routes remain disabled in the example; actual deployed settings are unverified.

## Actual local evidence

Windows x64, Node v24.22.1. Executed Node experimental SQLite :memory: assertions using the actual SQL files; no disk database or production fixtures. Six checks PASS:

1. Empty source creates two rows: environment=demo and synthetic main; car SYNTHETIC-001; trips/accounts/audit empty; session key has expected 64-hex format, value never printed.
2. Re-running source preserves complete row payloads/versions, including the generated session key.
3. Recovery creates only environment=demo, no main; repeated initialization preserves it.
4. Occupied fleet_store main sentinel is unchanged by either script; no rows inserted.
5. Synthetic production-marker fixture remains unchanged by either script; no main inserted.
6. Boundary reproduction: an unrelated table with a synthetic row does NOT prevent source initialization. Its row is preserved but a new fleet_store is created. The assertion passes because it confirms this limitation, not because the database is safe to initialize.

Also executed `node --experimental-sqlite tests/staging.test.mjs`: PASS, including config isolation, source/recovery initialization/rerun, no-R2/no-cron, synthetic state, built Staging Worker auth/Employee denial and disabled QR. This uses the already-built local artifact; no fresh build is claimed. Full npm ci/build/typecheck/npm test and new Linux CI were NOT_RUN in this review. Prior Linux 16-suite evidence remains in PROGRESS.md, not a new remote-initialization test.

## Limits requiring a manual gate

- SQL guards check whether fleet_store contains any row, not whether the entire database is empty. CREATE TABLE IF NOT EXISTS occurs before the guarded insert, so even an insert no-op is not proof of zero schema effects on an unexpected target.
- A pre-existing table with an incompatible schema is not validated/migrated by CREATE TABLE IF NOT EXISTS. Do not run either script to diagnose a real schema.
- The environment marker demo is shared by Demo and Staging. It cannot establish target identity; UUID/account verification remains mandatory.
- Exit 0 can mean zero inserted rows on an occupied target. Never infer successful initialization solely from command completion; validate approved row counts/markers afterward.
- The source's two rows use one guarded INSERT statement. The complete script has a separate CREATE statement; this review does not claim an all-or-nothing remote D1 transaction for the file.
- Opening the application can write main through readState. Never bind recovery to the app or use login/browser requests as a read-only occupancy check.
- APP_PASSWORD/private URL setup concerns later authenticated application testing, not a requirement to run isolated D1 initialization. Worker existence/deployment/R2 subscription are not prerequisites to initialize already-existing verified D1s.

No source/SQL/schema modification is proposed here. Existing guard behavior can be used only with the explicit operator checks below. If unattended wrong-target refusal is required later, review a separate hardening change rather than claiming these scripts provide it.

## Read-only preflight plan — not executed remotely

1. Through authorized metadata access, confirm the correct account and exact two name/UUID mappings. Use Dashboard or the explicit-config `d1 info` drafts in FIRST_STAGING_DEPLOYMENT.md. Stop on account ambiguity, mismatch or access failure. No token request in chat.
2. After target identity is established, obtain authorization for read-only schema/occupancy queries on these isolated D1s. Never query Fleet payloads or Production. Metadata size/usage alone cannot prove emptiness.
3. Inventory user tables using the following query draft. Review all unexpected objects; do not create/drop/relabel them. Internal provider tables, if present, must be identified as such rather than assumed safe from a name alone.

```sql
SELECT name, type FROM sqlite_master
WHERE type IN ('table','view','trigger') AND name NOT LIKE 'sqlite_%'
ORDER BY type, name;
```

4. If fleet_store exists, inspect its declared structure and count only; do not run the count if the table is absent:

```sql
PRAGMA table_info('fleet_store');
SELECT COUNT(*) AS fleet_store_rows FROM fleet_store;
```

Require id TEXT primary key NOT NULL, payload TEXT NOT NULL, version INTEGER NOT NULL DEFAULT 0. Any occupied fleet_store, unexpected user object or incompatible schema means STOP. Existing correctly initialized source/recovery is an inspection/no-op case, not permission to rerun/erase. Existing data review, if needed, requires its own scope.
5. Record schema/count evidence without payloads/keys, config and SQL SHA-256 hashes, reviewed branch/commit and target mappings. Ensure no app/operator writes can race between inspection and initialization; recheck immediately before approved execution. Do not deploy or invoke app startup during this window.

## Proposed initialization scope — separate approval required

Only after the above gates pass: execute config/initialize-staging.example.sql against the exact verified source and config/initialize-recovery.example.sql against the exact verified recovery target, using explicit configs. Exact command drafts are in FIRST_STAGING_DEPLOYMENT.md. Approval must cover creating the existing fleet_store structure on empty targets plus inserting synthetic rows; these are real database writes even though no new schema design is proposed. No other D1, resources, secrets, deployment, R2, Cron or public ingress is included.

Post-checks under that same explicit scope: source exactly two rows (environment/demo and main/version 0); confirm synthetic car and empty trips/accounts/audit via boolean/count summaries only, with session key existence/format checked without returning its value. Recovery exactly one demo marker, no main. Do not export full JSON. Stop on unexpected results; no retry that erases data, DELETE, replacement import or automatic rollback. Failed/partial operations require inspection and a new reviewed recovery decision; never touch Production.

## Disposition and remaining blockers

| Check | Result |
| --- | --- |
| Configuration and source/recovery separation | PASS locally |
| Synthetic SQL, rerun and occupied fleet_store preservation | PASS in SQLite |
| Whole-database emptiness / schema / concurrent access | NOT_VERIFIED on actual D1; operator checks required |
| Provider account and D1 identity | NOT_VERIFIED |
| Permission for real initialization | Not granted by this readiness-review task |
| Remote initialization and post-validation | NOT_RUN |

Next action: close provider identity access, collect authorized schema/count evidence on the two verified targets, then approve the exact synthetic initialization scope. This review prepares that decision and does not request credentials or execute cloud commands.
