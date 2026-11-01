# Task 3C.2K — Verified D1 reserved schema compatibility

Date: 2026-11-01 (Asia/Bangkok). Branch dev/smartfleet-batch-1 only. **Compatibility implementation/mock tests PASS; live API metadata NOT_VERIFIED; initialization NOT_READY.** Dashboard evidence does not substitute for API identity checks or separate write approval. No Cloudflare requests, credentials, initialization, deployment or resource changes performed.

## Dashboard evidence register

Source: the user's Task 3C.2K message dated 2026-11-01, confirming four Dashboard images and providing their transcribed findings. This register records that user-confirmed evidence separately by target; this session does not claim independent image-file inspection or API execution. No image filenames/URLs, exact capture times or content hashes were supplied, and none are invented.

Account shown/reported: **8853419a19293131998afe07ee651e62**.

| Target / evidence | User-confirmed Dashboard findings | Date / interpretation |
| --- | --- | --- |
| Staging identity/overview | smart-fleet-staging-db; f71ba325-027c-4b3f-abb2-71492493a8cf; Number of Tables=0 | 2026-11-01; target-linked Dashboard evidence recorded, not API metadata |
| Staging schema | sqlite_schema contains only table _cf_KV with the definition below; no fleet_store | 2026-11-01; no application schema observed in the reported result, not a physically empty database |
| Recovery identity/overview | smart-fleet-recovery-db; 5ec99f9c-4919-41f4-9bc4-c8c564a60296; Number of Tables=0 | 2026-11-01; independent Recovery Dashboard evidence recorded, not API metadata |
| Recovery schema | sqlite_schema contains only table _cf_KV with the same definition; no fleet_store | 2026-11-01; no application schema observed; recovery remains unbound from app |

Reviewed DDL, with exact case/spacing and no trailing semicolon:

```sql
CREATE TABLE _cf_KV ( key TEXT PRIMARY KEY, value BLOB ) WITHOUT ROWID
```

The official [Cloudflare D1 import/export documentation](https://developers.cloudflare.com/d1/best-practices/import-export-data/) identifies this reserved storage table, prohibits querying it and includes the corresponding definition in its conversion example. That supports this specific compatibility policy; it does not authorize excluding all `_cf_*` objects or reading the reserved table. Dashboard table-count metadata is not used by the planner as proof of application-schema emptiness.

## Narrow policy and identity capability

scripts/d1-provider-identity.mjs centralizes the two target name/UUID/binding tuples and the supplied approved Account ID. verifyCloudflareD1Identity reads the account and exact D1 metadata responses using the already-reviewed adapter transport; account result.id and database result.uuid/name must match. Config-only identity is not accepted as provider proof.

Only metadata returned by this verifier for the approved account gets a private WeakMap capability bound to one target and a maximum 60-second lifetime. Copied/serialized metadata, forged apiVerified/source flags, another account/target and expired evidence do not enable the exception. The ordinary planner remains strict for local/generic metadata even when it contains the correct literal identifiers. A future operator must create/reverify through a trusted authenticated transport; that transport must not fake/retarget API responses. In tests the transport is deliberately mocked, so capability acceptance there certifies software behavior only, never actual Cloudflare identity. No default network or credential discovery was added.

For a fresh provider-verified context, the planner accepts at most one object satisfying **all** of: type=table, name=_cf_KV, tbl_name=_cf_KV, and SQL byte-for-byte equal to the reviewed DDL above. No case folding, whitespace removal, prefix wildcard, optional column/constraint or alternate table name is used for this object. Different valid formatting is intentionally refused pending review. Other schema objects remain rejected, except the existing exact-compatible empty fleet_store. Duplicate objects, malformed/null DDL, views/indexes/triggers and populated fleet_store remain refused. No count or key/value read from _cf_KV is ever performed.

The private capability is a process-local freshness check, not cryptographic attestation or a remote database lock. It cannot make an untrusted injected transport trustworthy. Dashboard evidence and API results must remain identified by source/time; actual API verification has not occurred in this task.

## Planner / SQL guard parity

Both initialization SQL files contain the same exact reserved-object predicate and a default-disabled `/* VERIFIED_D1_RESERVED_CONTEXT */ 0` branch. Raw files retain strict rejection of _cf_KV. The planner changes only that marker to 1 in its in-memory plan after the approved target/config checks and a fresh capability check. It rechecks capability freshness after asynchronous planning, before returning the plan. No enabled raw config/file is persisted.

Thus generic/unknown context is strict in both planner and raw SQL; a verified plan uses the same limited object predicate in both layers. Neither branch creates, alters, deletes or reads values from _cf_KV. The pre-DDL schema assertion also rejects duplicate names and treats NULL matching results as refusal. Existing guarded insertion/occupied-row refusal is preserved; no destructive statement or Fleet schema redesign is introduced.

SQL itself cannot validate Cloudflare account/UUID. Never manually flip the marker or run a plan on an unverified target. A generated plan can become stale after it is returned; no executor or durable lock is implemented. Any future separately authorized executor must reverify actual account/D1 and re-run preflight immediately before writing, enforce the same target, isolate concurrent writers and halt on the first error. This task supplies no permission to execute even a valid plan.

## Test evidence

New tests/d1-reserved-schema.test.mjs is included in npm test (19 suites total). It has 60 Mock cases across Staging/Recovery: accepted exact reserved schema alone/with empty fleet_store; strict generic/raw-template rejection; wrong account/target/copied/forged/expired metadata; altered/null DDL, case/whitespace-identifier spoofing, extra columns, missing WITHOUT ROWID, comments, same-name view, duplicate objects, other tables/triggers/indexes and occupied-state preservation.

Tests compare the actual SQL pre-DDL guards against planner decisions using a read-only CTE populated with synthetic sqlite_schema metadata. They never create an actual or simulated _cf_KV table and never query its contents. Rejected guards preserve SQLite schema; occupied planner refusal preserves synthetic fleet payload/version. Existing 47 adapter and 28 initialization-safety fixtures remain passing. An initial new regression found duplicate-schema handling differed between planner and SQL; duplicate-name/null-safe checks were added before final full validation.

Actual Windows x64 Node v24.22.1: npm run build PASS (Demo 997247 / Production 995873 / Staging 996020 bytes); npm run typecheck PASS; npm test PASS all 19 suites. Bundled pnpm dlx npm launcher used. No dependency/lockfile/business logic/app/Production/Demo configuration changes. Actual Linux result for the published implementation is recorded in PROGRESS.md; Windows/mock evidence is not substituted for it.

## Readiness and next steps

| Gate | Staging | Recovery |
| --- | --- | --- |
| Target-linked Dashboard evidence | RECORDED from user, 2026-11-01 | RECORDED independently from user, 2026-11-01 |
| Exact reserved-schema compatibility | PASS in Mock tests | PASS in Mock tests |
| Real account/D1 metadata via API | NOT_VERIFIED | NOT_VERIFIED |
| Fresh live read-only schema preflight | NOT_RUN | NOT_RUN |
| Initialization/write approval and execution | NOT_APPROVED / NOT_RUN | NOT_APPROVED / NOT_RUN |

Next: use a separately reviewed/authorized authenticated read-only transport to verify real account/D1 metadata and current schema for each target, reconcile with Dashboard, then request separate approval for synthetic initialization. If identity, exact DDL, freshness, access or schema differs, retain strict rejection. No R2/Cron/routes/resources/Worker creation is needed for that read-only verification. Initialization remains NOT_READY regardless of this compatibility implementation passing.
