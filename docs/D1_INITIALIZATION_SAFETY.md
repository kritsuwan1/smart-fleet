# Task 3C.2F — D1 initialization safety

Task 3C.2K: [D1_RESERVED_SCHEMA_COMPATIBILITY.md](D1_RESERVED_SCHEMA_COMPATIBILITY.md) records both target-labelled Dashboard findings and a narrow exact-_cf_KV exception requiring fresh provider-response identity for the approved account/D1. Generic/copied/expired metadata and raw SQL templates stay strict. Planner-generated SQL uses the same context-gated predicate; no live API verification or initialization is claimed/authorized.

Task 3C.2I: Account ID supplied by user, but the reported _cf_KV schema image is not labelled with target name/UUID. Official Cloudflare documentation confirms the reserved table generally; it does not certify this image's provenance. Strict Allowlist remains unchanged. See [D1_SCHEMA_EVIDENCE_REVIEW.md](D1_SCHEMA_EVIDENCE_REVIEW.md) for value-free metadata checks, per-target evidence gates and a conditional future exception design.

Task 3C.2H adds a separate injected-transport read-only adapter; see [D1_READONLY_PREFLIGHT.md](D1_READONLY_PREFLIGHT.md). Only Mock transport was tested; Account ID/Dashboard schema evidence is still missing. This does not certify actual Cloudflare identity/emptiness or authorize initialization. The adapter has no write/deploy interface and supersedes the historical "no live preflight adapter" gap below at the implementation level only; live integration remains NOT_VERIFIED.

Development branch dev/smartfleet-batch-1 only. No Cloudflare SQL, initialization, deployment or resource change is authorized/performed by this task. This procedure supersedes the raw initialization-command drafts and silent rerun/no-op behavior in earlier Staging reports.

## Required read-only preflight

`scripts/d1-initialization-safety.mjs` exports `prepareD1Initialization({target, config, metadata, expectedAccountId, query})`. It has no CLI, network client, credentials or execution method. A future separately reviewed operator adapter must provide trusted provider metadata and a read-only query function bound to that same verified database. Supplying config values as purported provider metadata is not identity verification.

1. Independently verify the account and existing D1 identity through authorized metadata access. Target is strictly staging or recovery; no Demo/Production target is accepted. expectedAccountId must come from the independently approved account, not merely echo an unknown account from the connection.
2. Validate exactly one binding against the allowlist below, including provider database_name/database_id and matching provider account_id. Staging must retain the dedicated Worker name/entrypoint; recovery config cannot be a Worker. Identity/binding failures happen before any database query.
3. Query every non-SQLite schema object through `sqlite_schema`, including tables, views, indexes and triggers. Only no user object, or the exact existing empty fleet_store definition, is accepted. No guessed exemption for provider `_cf_*` objects is made; any such object requires separate verified review, not blind removal or allowlisting.
4. If fleet_store exists, COUNT(*) must return exactly zero. Existing records, including an already initialized source/recovery marker, cause refusal. No payloads or secret values are read. Unavailable/malformed query results also fail closed.
5. The API returns a frozen point-in-time review plan with SQL, its SHA-256, exact target/binding and requiresApproval=true. It does not execute or authorize SQL. Retain the plan privately, independently verify hashes and obtain explicit initialization approval. Any future executor must re-run preflight on its actual target immediately before writing and halt on the first SQL error.

| Target | Configuration / binding | Exact allowed database |
| --- | --- | --- |
| staging | staging-no-r2.example.jsonc / DEMO_DB | smart-fleet-staging-db / f71ba325-027c-4b3f-abb2-71492493a8cf |
| recovery | recovery-d1.example.jsonc / RECOVERY_DB | smart-fleet-recovery-db / 5ec99f9c-4919-41f4-9bc4-c8c564a60296 |

Accepted existing schema is the same fleet_store design, not a migration:

```sql
CREATE TABLE fleet_store(id TEXT PRIMARY KEY NOT NULL,payload TEXT NOT NULL,version INTEGER NOT NULL DEFAULT 0)
```

Definition comparison ignores whitespace/case only. Other equivalent-but-unreviewed definitions are intentionally refused rather than guessed safe. No table/schema is repaired or dropped by preflight. Provider-managed schema support remains NOT_VERIFIED; current strict refusal may require a separately reviewed allowlist after actual metadata inspection.

## SQL defense in depth

Both initialize-*.example.sql files now begin with a read-only sqlite_schema assertion BEFORE CREATE TABLE. Unexpected schema evaluates an intentionally invalid JSON expression and stops an error-halting runner before DDL. After CREATE TABLE IF NOT EXISTS, another assertion rejects any fleet_store rows before the synthetic INSERT. The INSERT retains its empty-table guard; there is no DELETE, DROP, UPDATE or REPLACE of old rows.

Error `malformed JSON` at these assertions means refusal, not a damaged backup or an instruction to remove the guard. Do not skip the failed assertion, continue individual statements, auto-retry, or disable error handling. A valid source creates synthetic marker/main; recovery creates marker only. Repeated initialization now raises an error and preserves data instead of silently inserting nothing. Review actual post-counts; exit status alone is insufficient evidence.

SQL cannot know Cloudflare Database IDs or account identity. Running a raw SQL file directly bypasses the identity check and is not the approved procedure. The planning API has no live adapter in this task; earlier direct remote initialization command drafts are superseded until an approved adapter/operator process enforces identity, immediate preflight and first-error stopping. No SQL-only or local mock result certifies cloud execution semantics.

Keep the databases isolated from app/operator writers during approved initialization. The plan is not a durable lock or a cross-statement transaction; real D1 batching/error/concurrency behavior is NOT_VERIFIED here. Recovery stays unbound from normal app startup, which can initialize main. No Worker/URL/R2/Cron or APP_PASSWORD setup is needed to perform read-only preflight on a verified existing D1.

## Verification

New tests/d1-initialization.test.mjs is included in npm test (17 suites total). 28 SQLite fixtures cover both targets: completely empty DB, compatible empty fleet_store, extra tables, view/index/trigger, unknown provider-like table, incompatible/extra-column schema, occupied main/marker/arbitrary rows, repeat attempts, identity/binding/account mismatches and failed queries. Assertions compare complete synthetic schema and row snapshots before/after rejected preflight and SQL execution. The preflight query spy accepts only SELECT/PRAGMA; wrong targets cause no query. No real Fleet data is used.

Actual Windows Node v24.22.1: npm run build PASS; npm run typecheck PASS; npm test PASS all 17 suites. Commands invoked through bundled pnpm dlx npm. Initial sandboxed pnpm realpath failed; approved local execution outside that restriction passed. No dependency, Business Logic, existing SQL schema design or Demo/Production configuration changes. New Linux CI evidence is recorded in PROGRESS.md when available; local PASS is not a Linux result.

## Remaining gates

Hardening passes locally. Real initialization remains NOT_READY: provider account/D1 identity and actual schema/occupancy unverified, no live preflight/execution adapter certified, and explicit database-write authorization absent. No R2/Cron, resource creation, secrets, Production or Demo changes are included. Post-initialization validation and recovery remain separate approved operations.
