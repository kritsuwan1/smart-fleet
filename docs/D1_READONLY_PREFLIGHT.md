# Task 3C.2H — Cloudflare D1 read-only preflight

Task 3C.2L: [LIVE_D1_VERIFICATION_PREPARATION.md](LIVE_D1_VERIFICATION_PREPARATION.md) supplies current endpoint/permission review, operator-owned transport proposal, approval-before-adapter-creation sequence and redacted evidence plan. Adapter/verifier now enforce the exact approved account before any request/read; no new account/database added. Only Mock tests run; live authentication/transport/metadata/schema NOT_VERIFIED and no live CLI/broker is implied.

Task 3C.2K update: target-labelled Dashboard evidence now recorded; actual API metadata still NOT_VERIFIED. Adapter uses a shared provider identity verifier and a private short-lived capability for the exact approved-account/target reserved-schema exception. No _cf_KV values/counts are queried; arbitrary/generic contexts remain strict. See [D1_RESERVED_SCHEMA_COMPATIBILITY.md](D1_RESERVED_SCHEMA_COMPATIBILITY.md) for current rules and evidence; earlier statements below are historical.

Task 3C.2I evidence update: user supplied Account ID and an unlabelled Console schema description containing _cf_KV. Missing-input/history statements below describe Task H; account input is now supplied, but actual API identity and complete target-linked schema remain NOT_VERIFIED for both databases. No Allowlist relaxation or protected-table value access. See [D1_SCHEMA_EVIDENCE_REVIEW.md](D1_SCHEMA_EVIDENCE_REVIEW.md).

Branch dev/smartfleet-batch-1. **Adapter/mock validation PASS; actual Cloudflare NOT_VERIFIED.** User answered that Dashboard schema has not been checked. No verified Account ID or schema/count evidence has been supplied. Do not conclude that either database is empty. User reports no Staging Worker; no Worker is required by this adapter, and no provider-side Worker existence check was performed.

## Interface and trust boundary

scripts/d1-readonly-adapter.mjs exports createD1ReadonlyAdapter. The existing initialization planner now exports shared target/config validation and exact schema/count SQL constants. No application, database schema, initialization SQL, Production/Demo config or dependencies are changed by this task.

The adapter requires an explicitly supplied authenticated fetch-compatible transport. There is no default global fetch, CLI, credential discovery, token argument, subprocess, Worker binding or deployment/initialization method. In this task transport is only an in-memory Mock. A trusted operator/session integration for real authentication is intentionally external; do not send tokens in chat, read credential files, reveal secret values or set real environment variables to run this task. The supplied transport must honor redirect:error, signal, exact URL/method/body and must not retarget requests, retry elsewhere or log auth headers/raw provider responses. Adapter code does not prove that an arbitrary injected transport is trustworthy.

For future authorized operation, expectedAccountId must be independently confirmed from Dashboard, not inferred from the API connection or Config. Shared validation accepts exactly one configured binding for one of:

| Target | Binding | Database name / UUID |
| --- | --- | --- |
| staging | DEMO_DB | smart-fleet-staging-db / f71ba325-027c-4b3f-abb2-71492493a8cf |
| recovery | RECOVERY_DB | smart-fleet-recovery-db / 5ec99f9c-4919-41f4-9bc4-c8c564a60296 |

Wrong target/binding/config/Account ID format is refused before transport access. Config is cloned to prevent caller mutation from retargeting an active review. No account-wide database listing or Production/Demo requests are issued.

## Actual requests constructed by the adapter

Only https://api.cloudflare.com/client/v4 is used, with fixed allowlisted account/database paths:

1. GET /accounts/{independently-confirmed-account-id}. Compare response result.id with the independently approved Account ID. A path/config value alone is never evidence of actual account identity. See [Account Details](https://developers.cloudflare.com/api/resources/accounts/methods/get/).
2. GET /accounts/{account-id}/d1/database/{allowlisted-uuid}. Compare response result.uuid and result.name with the exact approved target; construct planner metadata from these responses, not Config. See [Get D1 Database](https://developers.cloudflare.com/api/resources/d1/subresources/database/methods/get/).
3. POST to that same database's /query endpoint with exactly one of the two SELECT constants below and params=[]. Cloudflare uses POST for queries; this adapter restricts SQL to reads. See [Query D1 Database](https://developers.cloudflare.com/api/resources/d1/subresources/database/methods/query/). The documented query endpoint accepts D1 Read; account metadata additionally needs an appropriate read permission such as Account Settings Read. Do not upgrade privileges or change resources automatically on permission failure.

```sql
SELECT type,name,tbl_name,sql FROM sqlite_schema WHERE name NOT GLOB 'sqlite_*' ORDER BY type,name
SELECT COUNT(*) AS row_count FROM fleet_store
```

Each SELECT is a separate allowlisted request; not a multi-statement batch. No arbitrary SELECT/PRAGMA, payload reads, writable PRAGMA, comments, extra statement, SQL file or user-supplied SQL is accepted/exposed. COUNT occurs only after the existing planner validates an exact fleet_store schema. No table means the count is skipped. Unknown tables/views/indexes/triggers/provider-like objects remain refused, not ignored. D1 num_tables metadata is not used as proof of emptiness.

HTTP 401/403, redirects, request/JSON errors, success=false, malformed/multiple query results and unexpected rows_written/changed_db metadata fail closed. Failure messages do not include provider response/error text or headers. No retry/fallback target is attempted. Operational request failures close that adapter; later review cannot issue further requests. The planner may report a generic SCHEMA_QUERY/COUNT_QUERY refusal for failed SQL transport calls; do not interpret that as an empty database or automatically a schema defect.

## Future operator use — not executed against Cloudflare here

1. Confirm the account and both name/UUID mappings in Dashboard. Collect schema/count evidence independently, without Fleet payloads or secrets. Current user response is "not checked"; this gate is pending.
2. Review a trusted already-authorized transport with only the read permissions/resources needed. Do not grant new permissions, create tokens/resources or reuse Production credentials as an implied step of this task. On access failure, stop and use Dashboard; no token request in chat.
3. Load only the chosen reviewed Staging or Recovery JSONC config. Supply the independently approved account ID and transport to the adapter:

```js
import {createD1ReadonlyAdapter} from './scripts/d1-readonly-adapter.mjs';
const adapter = await createD1ReadonlyAdapter({
  target: 'staging', // or 'recovery', with its matching config
  config: reviewedConfig,
  expectedAccountId: independentlyConfirmedAccountId,
  transport: approvedAuthenticatedTransport
});
const summary = await adapter.review();
```

This is integration guidance, not a ready CLI or permission to connect. There is no secret-handling snippet or default credential source. Tests demonstrate the fetch-compatible response contract without any live transport.

4. Compare metadata and schema/count findings with independently collected Dashboard evidence before describing a database as empty. The adapter summary deliberately always records dashboardSchema=NOT_VERIFIED; human evidence reconciliation is not forged by code. A mock summary preflight=PASS is only a fixture result, never a live identity certificate. Keep provider/source of evidence and time explicit.
5. review() exposes only summary metadata/status/hash, no initialization SQL or execution function. Any subsequent initialization remains a separate authorized write task with renewed immediate preflight, isolation from writers and first-error stopping. Read-only inspection is a point-in-time observation, not a lock or deployment approval. No Worker/R2/Cron/routes are created or required.

## Actual tests and disposition

37 new Mock/SQLite fixtures test both targets, empty/existing empty schema, provider Account/UUID/name mismatch, binding/target/config refusal before network, unknown schema/occupied preservation, HTTP 401/403 at every stage, query/network/JSON/redirect/malformed/batched-result failure, suspicious write metadata and mutation of original Config. Every captured URL/method/body must match the read-only allowlist; no secret or live transport is used. Existing 28 initialization safety fixtures also pass.

Windows x64 Node v24.22.1: npm run build PASS, npm run typecheck PASS, npm test PASS all 18 suites. An initial full test run exposed a Mock fixture retaining a mutable Config reference; the fixture was corrected to clone its expected provider identity and the full suite rerun passed. No app/Business Logic change was needed. Linux CI for the published snapshot is recorded in PROGRESS.md.

Real Cloudflare account metadata, D1 identity, permission behavior, schema/occupancy and independent Dashboard comparison remain NOT_VERIFIED. No Cloudflare API requests, credential reads, database writes, initialization, resource changes, Deploy/Merge, Production/Demo access, R2/Cron or public routes occurred. Real initialization remains NOT_READY.
