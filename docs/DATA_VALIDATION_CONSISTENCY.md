# Task 3D.2 — Data-validation consistency (offline Development)

2026-11-04, Asia/Bangkok. Repository kritsuwan1/smart-fleet, branch dev/smartfleet-batch-1. **Task 3D.1 verification PASS; both reported defects reproduced before the fix and rejected after it.** Operator/Live/Initialize/Deployment remain DEFERRED; actual cloud verification NOT_VERIFIED. No real data, credentials/resources or cloud API accessed.

## Prerequisite audit closure

Verified GitHub branch HEAD acbc8bfa6ea53f8a1e4d9a44e6d1cc8b640f8816. Its parent is cbdc2e36515bc559a37024a9f0e1f404c96acee5; the commit contains exactly the eight expected docs paths, including FEATURE_AUDIT_3D1 and ROADMAP. No source/test/config/schema/package change in that audit commit. Therefore the user's stop condition was not triggered and Task 3D.2 could begin.

## Reproduction and fix

New regression suite initially ran against unchanged application source:
~~~json
{"backupRejected":false,"carStatus":200}
~~~
It failed the expected assertion, reproducing both reported defects. After implementation:
~~~json
{"backupRejected":true,"carStatus":400}
~~~

- [validation.ts](../src/validation.ts) shares the existing Trip value rules: strict local Thai-time YYYY-MM-DDTHH:mm with calendar round trip, return >= departure, integer odometers 0–99,999,999, return odo >= departure, and null return odo for an open trip.
- [fleet.ts](../src/fleet.ts) delegates only those value checks. Existing Thai errors, references, text limits, overlap and reason-based continuity remain in validateTrip. No Fleet field/schema or trip business policy added.
- [backup.ts](../src/backup.ts) reuses the value checker for each referenced trip and the shared car initial-odometer bound. A valid checksum cannot override invalid application values. Existing checksum/format/size/reference/legacy and Maintenance validation remain.
- [api.ts](../src/api.ts) rejects car creation/edit outside the same numeric bound before persistence/audit. Existing form numeric-string conversion remains supported; valid boundary values stay allowed.
- [App.tsx](../src/App.tsx) car initial-odometer input uses the shared maximum; server validation remains authoritative. No Worker handlers/routes/cloud config changes.

The Backup inspector deliberately does **not** call the entire validateTrip function: that would also impose unrelated text/overlap/continuity policies on old backup records. Valid legacy envelopes, missing optional accounts/Maintenance/session fields, long legacy notes and unknown fields are preserved by tests. No file/record is repaired, clamped, filtered, migrated or rewritten during inspection. Existing-invalid chronology/calendar/open-closed values now cause refusal, including in legacy files; obtain an owner-approved data review rather than bypassing validation.

## Restore boundary and regression evidence

[tests/validation-consistency.test.mjs](../tests/validation-consistency.test.mjs) adds 163 cases, included in npm test (23 suites total).

For 20 invalid state variants, tests construct manual current/legacy envelopes and synthetic automatic artifacts with **correct recomputed state/envelope SHA-256, metadata counts and byte sizes**. Cases cover backwards time, impossible dates, hour/minute/precision errors, negative/fraction/out-of-range/missing/open/closed odo and invalid car bounds. Each manual/automatic inspector refuses.

For each invalid artifact, the existing restoreAutomaticBackupToStaging function is called against two SQLite :memory: targets: one with no main row and one already populated, both with a sentinel row. It may read the synthetic environment marker, but **zero SQL run calls** occur. Full sqlite_schema, all rows/payloads and versions remain identical. No actual D1 is accessed. The existing restore code already calls inspectAutomaticBackup before generating/replacing the session key or inserting main; no restore executor or guard change was needed.

Valid tests include zero/max odo, equal departure/return, leap day, Thai-time year rollover, open trips and legacy missing optional fields; isolated synthetic recovery preserves every state field except the intentional existing session-key rotation. API creation/edit tests preserve valid numeric-string inputs, reject invalid values with no effective row/version/audit changes, and verify the exact created/edited car and resulting version. Trip reason-based discontinuity remains accepted.

This is not a new arbitrary-SQL safety guarantee. Manual SQL restore is a trusted operator procedure and has no JSON upload/write route; arbitrary SQL can bypass JavaScript inspection. Do not execute SQL or restore real databases under this task. Operational restore/initialization remains separately DEFERRED.

## Actual validation

- Windows x64 Node v24.22.1: npm ci PASS (42 installed, audited 43; reported 0 vulnerabilities), build PASS (Demo 996817 / Production 995443 / Staging 995590 bytes), typecheck PASS, npm test PASS all 23 suites including new 163 cases. Existing 22 suites and security/environment/Backup/Maintenance/permissions/import/report/receipt regressions pass. No lint script.
- npm ci reported blocked esbuild/workerd install scripts under the existing allowScripts policy; no policy/approval was changed. Build, native local workerd and tests succeeded. Dependencies/lockfile unchanged.
- Exact implementation 77b3607 Linux CI [41755017762](https://github.com/kritsuwan1/smart-fleet/actions/runs/41755017762) PASS: Ubuntu 24.04.5 / Node v24.22.1, npm ci/build/typecheck/all 23 suites including new 163. Decoded logs/runtime commit metadata checked; details in PROGRESS.md. Documentation follow-up does not change the executable snapshot.
- No real browser/device acceptance is claimed for the added HTML max attribute; Typecheck and API boundary regressions establish the current check scope.

## Remaining scope

Historical audit D1/D2 defects are closed by these tests; the rest of FEATURE_AUDIT_3D1 remains active. Current checkers do not certify backup provenance, confidentiality or every historical business relationship. No broad data audit, arbitrary SQL sandbox, schema migration or cleanup was introduced. Records that violate the now-enforced existing Trip value rules are refused and preserved for review, never silently changed.

Recommended next task: **3D.3 — reliable submit and truthful confirmation**, starting with the same-task submit guard and delayed/lost-response/409/401 local tests. Staff/User/onboarding policy remains an owner decision. Operator setup, Cloudflare Live, real D1 initialize/restore, deployment, R2/Cron/Worker/public routes and main merge remain deferred/unapproved.
