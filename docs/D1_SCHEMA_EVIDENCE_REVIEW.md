# Task 3C.2I — D1 schema evidence review

2026-11-01, dev/smartfleet-batch-1. **Review/tests PASS; Staging and Recovery identity/schema NOT_VERIFIED; initialization NOT_READY.** No real Cloudflare access or SQL executed. No Allowlist relaxation, runtime/config/schema/initialization SQL changes or protected-table data access.

## Evidence classification

- User supplied Dashboard Account ID: 8853419a19293131998afe07ee651e62. This supersedes the earlier missing-input note; it is user-confirmed Dashboard evidence, not an independently verified API account response. No credential/token was supplied or requested. Do not embed this identifier into Production/Demo settings or treat it as transport authentication.
- User reports a D1 Console sqlite_schema result containing table _cf_KV with SQL `CREATE TABLE _cf_KV ( key TEXT PRIMARY KEY, value BLOB ) WITHOUT ROWID`, and no fleet_store visible in the image. This review uses that supplied description; no independently executed provider query or complete image/result-set verification is claimed.
- The image lacks database name/UUID context. It cannot be assigned to either target, cannot prove all schema objects were shown, and cannot prove the absence of fleet_store or application data. One database's result must not certify the other.

## Cloudflare documentation finding — PASS

The official [D1 import/export documentation](https://developers.cloudflare.com/d1/best-practices/import-export-data/) identifies _cf_KV as a reserved table of D1 storage and states it cannot be queried. Its SQLite conversion example shows the same key TEXT PRIMARY KEY/value BLOB/WITHOUT ROWID definition. Thus the reported definition is consistent with documented D1 internals; that is supporting evidence, not proof of the unidentified image's database provenance or a blanket safety exemption.

The documentation's instruction to remove a CREATE statement from an offline import file is not an instruction to DROP, alter, clear or recreate the live reserved table. No such command is proposed. Do not SELECT keys/values, COUNT rows FROM _cf_KV, run PRAGMA against it, probe permissions by querying it, or export its contents.

## Separate target assessment

| Target | Expected UUID / binding | Evidence and outcome |
| --- | --- | --- |
| smart-fleet-staging-db | f71ba325-027c-4b3f-abb2-71492493a8cf / DEMO_DB | Account input supplied; image-to-target mapping, full schema and metadata response NOT_VERIFIED. No empty-database conclusion. Current strict policy refuses a schema containing _cf_KV |
| smart-fleet-recovery-db | 5ec99f9c-4919-41f4-9bc4-c8c564a60296 / RECOVERY_DB | Independent evidence missing; cannot reuse Staging/anonymous image. Same strict refusal if _cf_KV is present. Must stay unbound from app; absence of main is a later recovery-target check, not proof supplied here |

## Read-only Dashboard evidence procedure — draft only

For each target separately, in the supplied account: select D1 Overview/Settings and record the exact database name/UUID together with account context and observation time. Verify against the expected mapping above before opening its Console. No Production/Demo navigation or query is required. If any identity differs, stop.

After identity confirmation, use only schema metadata:

```sql
SELECT type,name,tbl_name,sql
FROM sqlite_schema
WHERE name NOT GLOB 'sqlite_*'
ORDER BY type,name;
```

Capture the complete result, query and selected target identity with no truncation/pagination ambiguity. Keep every non-SQLite object visible, including _cf_KV and any views/triggers/indexes. Inspect _cf_KV's type, tbl_name and SQL in sqlite_schema only; never inspect its rows. If the Console does not provide complete schema output, record NOT_VERIFIED rather than infer missing objects.

Only if fleet_store exists with the exact accepted definition, an authorized operator may inspect its row count (never payloads):

```sql
SELECT COUNT(*) AS row_count FROM fleet_store;
```

Do not run this count if fleet_store is absent; an error is not emptiness evidence. An actual table in the database means the database is not physically empty. A later verified conclusion may be "no application tables" or "empty compatible fleet_store", while preserving the provider table; avoid saying "empty database" without qualification.

For an eventual authenticated adapter review, compare real account result.id with the user-provided Account ID and D1 result.uuid/name with the selected target. The existing adapter uses metadata responses rather than Config as provider evidence. It has no available live authenticated transport in this task. Never request/read secret values or treat Config IDs as actual API results.

## Allowlist decision and proposed conditional design

**Do not change the Allowlist in this task.** Documented D1 internals explain a likely compatibility obstacle; they do not close missing per-target provenance/full-schema evidence. Current rejection is intentional and tested. The same exception must not be enabled on local SQLite, Demo/Production, arbitrary `_cf_*` names or generic adapters merely because an object is called _cf_KV.

After complete identity-linked evidence exists, a narrowly scoped provider-table exception may be appropriate for the verified Staging and Recovery targets. Before implementing it, require all of:

1. Verified approved account metadata plus exact target UUID/name/binding; independently complete Dashboard evidence for each target and an explicit evidence reference/date, not a shared screenshot assumption.
2. Exactly one _cf_KV table object with matching type/name/tbl_name and the reviewed definition (two declared columns, expected primary key/types and WITHOUT ROWID). Exact spelling/DDL constraints must be reviewed; name/prefix-only checks or broad whitespace normalization must not mask altered identifiers/definitions. Matching DDL alone still does not establish provenance.
3. No other unexpected table/view/index/trigger, altered definition, extra column or unknown provider object. Continue rejecting a nonempty fleet_store. No reads of _cf_KV rows, values or counts; its contents are irrelevant to application-data emptiness and must be preserved.
4. Treat only that verified provider object as excluded from application-schema emptiness, while retaining it in evidence. Keep strict default rejection when identity/evidence is absent, stale, changed, ambiguous or unavailable. Reverify immediately before any future authorized initialization; inspection is not a lock.
5. Update both planner and initialization SQL guards consistently, without weakening account/binding/occupied-row checks or adding destructive SQL. Add success/refusal/value-access-spy/preservation tests for both targets; actual provider behavior must be validated in a separately scoped read-only exercise. This review neither implements nor certifies that future exception.

## Safety tests and actual results

Added ten metadata-only Mock fixtures (five each for Staging/Recovery) to tests/d1-readonly-adapter.test.mjs: documented _cf_KV alone; with compatible fleet_store; altered definition; same-name view; and additional user table. Every case must raise INITIALIZATION_REFUSED_SCHEMA under the current policy. Only the fixed sqlite_schema SELECT is sent; no fleet_store count, protected-table query, creation or mutation occurs in these new cases. The schema evidence is mocked JSON, not a real or simulated _cf_KV table. Existing application tests use only synthetic isolated fixtures.

Windows x64 Node v24.22.1: Build PASS (Demo 997247 / Production 995873 / Staging 996020 bytes); Typecheck PASS; npm test PASS all 18 suites, including 47 adapter fixtures (37 prior + 10 new) and 28 initialization-safety fixtures. Commands use bundled pnpm dlx npm; no dependency/lockfile/runtime/schema/SQL/config changes. Current Linux publication evidence is recorded separately in PROGRESS.md.

Remaining: complete target-labelled schema evidence for both D1s, independently verified provider metadata, then the conditional exception design/review if needed. Actual readiness remains NOT_READY; no initialization, deploy, merge, real writes/resources/credentials/Production/Demo/R2/Cron operations occurred.
