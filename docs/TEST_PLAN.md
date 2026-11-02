# SmartFleet - Test Plan

## Task 3C.2M — Mock-only Broker

- Added tests/d1-broker.test.mjs to npm test (20 suites), 75 cases: both targets, exact host/account/UUID/method/body/SQL/order, default mock/live denial, no injected network/credential options, permission/network/identity/schema failures, redirect/abort/concurrency/budget/replay/expiry refusal and redacted evidence persistence/no-overwrite/hash.
- Shared the unchanged pure schema policy between planner and broker. Broker response fixtures are JSON only; no _cf_KV table/value/count operations or Cloudflare calls. Global fetch tripwire verifies zero calls. No SQL executor, initialization or deploy method is exposed. Mock manifest checker cannot authorize live mode.
- Actual Windows Node v24.22.1 Build/Typecheck/all 20 suites PASS; existing adapter 48/reserved 61/initialization 28 fixtures remain PASS. Offline Staging and Recovery CLI rehearsals PASS with separate ignored mock evidence files. Linux evidence follows in PROGRESS.md. See D1_MOCK_BROKER.md for limits and future live approvals.

## Task 3C.2L — Live read-only preparation / account scope

- Found request-scope gap: prior adapter/verifier accepted another syntactically valid account before schema checks. Tightened both to the already-approved Account ID; new tests assert wrong valid-format account produces zero transport/read calls. No Account/DB tuple added.
- Related suites PASS: adapter 48 Mock fixtures, reserved schema 61, initialization safety 28. Existing redirect/wrong-identity/query/permission failure tests remain passing. Adapter fixtures use the public approved identifier in fake responses; exact reserved-schema acceptance and altered-schema refusal reflect the K policy. No live credentials/network/protected-table data.
- Actual Windows Node v24.22.1 Build/Typecheck/all 19 suites PASS. Linux evidence follows publication. Operator approval, authenticated transport/broker review and evidence recorder are planned in LIVE_D1_VERIFICATION_PREPARATION.md, not implemented live capabilities. No Cloudflare API call; actual metadata/schema/permission/authentication NOT_VERIFIED.

## Task 3C.2K — Verified reserved schema compatibility

- Added tests/d1-reserved-schema.test.mjs to npm test (19 suites): 60 Mock cases cover exact approved-account/provider capability and DDL acceptance for both targets, strict generic/raw rejection, copied/forged/expired/wrong-target identity, malformed/altered/null DDL, extra columns/objects, duplicate names, same-name views and occupied preservation. Existing adapter 47 / initialization 28 fixtures remain PASS.
- Evaluate actual SQL guards with synthetic sqlite_schema CTEs, never create or read _cf_KV. Compare planner/SQL acceptance and assert schema/payload preservation on refusal. Duplicate metadata regression initially exposed a parity gap; duplicate-name/null-safe SQL guard fixes pass final validation. No real database or protected-table changes.
- Actual Windows Node v24.22.1 Build/Typecheck/all 19 suites PASS. Linux evidence follows publication in PROGRESS.md. User-confirmed Dashboard evidence is recorded separately for Staging/Recovery dated 2026-11-01; live API verification NOT_VERIFIED, initialization NOT_READY. See D1_RESERVED_SCHEMA_COMPATIBILITY.md.

## Task 3C.2I — Reserved-table schema evidence

- Added ten metadata-only Mock cases to the existing read-only adapter suite: five each for Staging/Recovery, covering the documented _cf_KV definition alone/with fleet_store, altered DDL, same-name view and additional user table. All must refuse under the unchanged strict Allowlist, send only sqlite_schema SELECT and never query/create/modify _cf_KV or count its rows.
- Actual Windows Node v24.22.1 Build/Typecheck/npm test PASS all 18 suites; adapter fixtures now 47, initialization-safety fixtures 28. No runtime/schema/config/SQL guard changes. User-supplied unlabelled schema description is not live identity/emptiness evidence; per-target Dashboard/API confirmation remains NOT_VERIFIED. See D1_SCHEMA_EVIDENCE_REVIEW.md for source and conditional policy proposal. Linux evidence follows in PROGRESS.md.

## Task 3C.2H — D1 read-only adapter

- Added tests/d1-readonly-adapter.test.mjs to npm test (18 suites): 37 Mock/SQLite fixtures cover exact provider Account/UUID/name identity, both allowlisted targets, binding/config refusal, unknown schema/occupied data, permission failure at all request stages, network/query/JSON/redirect/result failure, unexpected write metadata and config mutation isolation.
- Capture every request: only two fixed metadata GET endpoints and same-target query POST with one of two exact read-only SELECTs. No arbitrary SQL, payload reads, write/resource/deploy endpoints, credentials or default live transport. Existing 28 initialization-safety fixtures remain PASS.
- Actual Windows Node v24.22.1 Build/Typecheck/all 18 suites PASS after correcting a Mock-only mutable identity fixture. No app/schema/dependency/config/SQL-initialization changes. Linux CI result follows publication in PROGRESS.md. User confirmed Dashboard schema has not been checked; actual Cloudflare and database emptiness remain NOT_VERIFIED. See D1_READONLY_PREFLIGHT.md.

## Task 3C.2F — Initialization safety regression

- Added tests/d1-initialization.test.mjs to npm test: 17 suites total. 28 fixtures cover both staging/recovery empty targets, exact empty fleet_store, unexpected user tables/views/indexes/triggers/provider-like objects, incompatible schema, occupied/repeated targets, identity/binding/account failures and malformed/query errors.
- Preflight reads sqlite_schema and row counts only; rejected targets issue no writes and identity failures issue no query. SQL assertion errors before DDL preserve entire synthetic schema/rows on unrelated-table targets. Repeated/occupied initialization now throws with unchanged data; existing staging suite updated accordingly.
- Actual Windows Node v24.22.1 build/typecheck/all 17 suites PASS. No Cloudflare/real DB initialization. See D1_INITIALIZATION_SAFETY.md for strict schema allowlist, point-in-time/concurrency limitations, operator prerequisites and unverified provider internals. Linux result is recorded separately in PROGRESS.md; no inference from Windows.

## Task 3C.2B — Approved dependency compatibility

- User-approved parent upgrade: Wrangler 4.116.0, Miniflare 4.20260730.0, scoped sharp 0.35.5/undici 7.30.1; ws 8.21.0 supplied by parent, esbuild 0.28.1 deduplicates old vulnerable copy. Production lock entries unchanged; no force fix, app source/config/schema change or real Cloudflare access.
- Actual full audit before Critical 0 / High 3 / Low 1; after all severities 0, exit 0. Fresh production-only audit 0, exit 0. B1 dependency gate resolved for this snapshot; remaining cloud/setup/deploy gates stay pending.
- New tests/toolchain.test.mjs is appended to npm test (16 suites): resolved version pins/Node 24, native sharp PNG/JPEG/resize, undici HTTP/ws echo on loopback, Miniflare/workerd ephemeral D1 query persistence, and actual compiled Staging Worker login/role protection/synthetic D1/maintenance create-complete-correct/manual backup/disabled automatic backup and QR. No R2 binding/real services required. Test login uses redirect:manual, preserving auth behavior.
- npm ci/build/typecheck/all 16 suites PASS on Windows Node v24.22.1. Native workerd smoke compatibility date is 2026-07-30 (supported local runtime); provider config-date/real cloud integration remains NOT_RUN. New Linux CI result is recorded by SHA/run/log evidence in PROGRESS.md. No lint script exists.
- No Deploy/Merge/Production/real DB/Secrets/environment/resource/R2/Cron changes. Security remediation success alone is not a Staging deployment authorization.

## Task 3C.2A — Safe rollback fix / remaining blockers

- New regression initially FAIL: invalid plan creation threw but left maintenancePlans mutated in the caller. Fixed changeMaintenance with staged maintenance-field copies and commit-after-validation for all operations. Invalid plan and invalid completion now preserve the full input state; earlier history-correction/manual-override rollback checks remain. Success rules, API roles, schema and vehicle/trip logic are unchanged.
- Actual Windows Node v24.22.1 npm ci/build/typecheck/npm test PASS, still all 15 suites. Optional local Edge history-correction/mobile/double-submit checks PASS. New Linux CI evidence is recorded in PROGRESS.md after commit.
- Fresh audit remains FAIL: Critical 0 / High 3 / Low 1; production-only audit PASS (zero). No safe patch-only closure confirmed; explicit breaking-change proposal is documented in BLOCKER_RESOLUTION.md and was not installed. No force fix or package/lockfile change.
- Local config entrypoint/bindings/exact user UUIDs/separation/no-R2/no-Cron/QR isolation verified. Actual provider identities/Worker/access/secrets/initialization/recovery/UAT remain NOT_VERIFIED/NOT_RUN and are blockers, not inferred PASS. Overall NOT_READY; no real initialization/deploy/rollback command run. Full risk/evidence/FIXED/REMAINING/approval inventory: [BLOCKER_RESOLUTION.md](BLOCKER_RESOLUTION.md).
- Gate sequencing clarification: security/identity/target/access/containment and deployment approval are pre-deployment gates. Remote Staging integration/recovery/UAT are post-deployment acceptance checks whose plan must be approved first; they are not a circular prerequisite to uploading the first isolated Staging version. R2/Cron remain unnecessary for the explicitly no-R2 mode.

## Task 3C.1 — History correction and no-R2 Staging readiness

- Prerequisite Task 3B Linux run 41283265689 PASS for 346f4db7be6f7fee3755b68ea81d562a9cd4b4b9, 14 suites, Node 24.22.1; logs verified.
- Maintenance suite now tests Admin correction/audit, immutable record identity, employee denial, stale version rejection, negative-cost rollback, chronological bounds, older-record edits not changing the current schedule, latest-derived due recalculation, manual-plan override rejection with zero in-memory/persisted rollback damage, and archived one-off plan preservation. The previous unsupported-history test now checks unknown-ID rejection; history editing is implemented.
- New staging.test.mjs is appended to npm test (15 suite files): no-R2/no-cron/private config properties and non-production IDs; source/recovery initialization on SQLite and rerun/occupied refusal; staging build label, QR disabled, Demo/Production host rejection, production marker rejection, synthetic fallback, Admin login and Employee write denial; scheduled handler disabled with unchanged source state. No cloud DB is accessed.
- Optional Edge browser test now fills/saves a history correction at 360px and checks satang cost/audit/original record identity and unchanged cars/trips; earlier responsive/double-submit checks remain. Local identities are injected; physical/Safari/remote Staging UAT remains NOT_RUN.
- Final Windows Node 24 build/typecheck/15 suites PASS; actual Linux result is recorded in PROGRESS.md. Security audit remains FAIL (High 3 / Low 1), actual existing D1 identities and remote initialization NOT_VERIFIED/NOT_RUN. Deployment remains NOT AUTHORIZED; do not infer Cloudflare readiness from SQLite tests. See STAGING_READINESS.md for future commands requiring separate approval.

## Task 3B — Maintenance review evidence

- Extended existing maintenance suite (still 14 npm test suites): nine-case date/km/either matrix, inactive-plan/car Employee response filtering, fresh-version duplicate retries, concurrent same-version writes (one 200 / one 409), unsupported editHistory request rejected without writes. Initial duplicate regression reproduced a 200 response where rejection was required; fixed by exact-match guards.
- Optional tests/maintenance-browser.mjs: local real React Dashboard + fleetApi + synthetic SQLite, identity injected. Edge 156.0.4314.58 actual browser PASS for plan add/edit, history creation/view, Employee read-only UI, two same-task submits yielding one request for both forms, and no document overflow at 360/390/768/1280px. At 360, plan/service forms and history were exercised and screenshots visually reviewed. Optional browser test is not part of npm test/Linux CI; setup/command are in MAINTENANCE_STAGING_REVIEW.md.
- npm ci/build/typecheck/all 14 suites PASS on Windows Node v24.22.1; final Linux results recorded in PROGRESS.md. No real cloud DB/credentials used.
- Acceptance FAIL: history editing NOT_IMPLEMENTED. Security gate remains High 3 / Low 1. Remote Staging D1/auth/access integration, real-device Safari/UAT NOT_RUN. Overall Staging deployment readiness: NOT READY; passing regression tests do not close these gaps. See [review/report](MAINTENANCE_STAGING_REVIEW.md) for PASS/FAIL matrix and required fixes. No deployment or resource activation authorized.

## Task 3A — Maintenance tests (current development)

New tests/maintenance.test.mjs is appended to npm test (14 suites total). Uses synthetic fleet state and independent in-memory SQLite; no schema/resources/production access.

| Case | Validation |
| --- | --- |
| MT-001 | Missing optional fields accepted; GET preserves legacy state without eagerly adding arrays |
| MT-002 | Per-car km/date/either urgency, exact thresholds, Bangkok day boundary, all five work types |
| MT-003 | Reject invalid dates/references/numbers, negative/fractional costs, oversized details, invalid recurrence and duplicate IDs |
| MT-004 | Complete/advance km or day cycles; archive one-off plans; retain history and car/trip data; disallow car reassignment/history regression |
| MT-005 | Admin writes/audit, employee write denial and history/cost redaction, stale version conflict and failed-write atomicity |
| MT-006 | Existing car/trip writes and import planning preserve maintenance; JSON/SQL/automatic backups retain it; isolated SQLite recovery matches full state except rotated sessionKey |
| MT-007 | Static UI role separation, empty state and escaped names; responsive CSS added with labelled controls/44px touch targets |

Actual Windows Node 24 build/typecheck/all 14 suites PASS; final Linux evidence is recorded in PROGRESS.md. Real browser form interactions, 360px mobile overflow/focus checks and Staging UAT remain NOT_RUN; static rendering does not replace them. Cloud R2/D1 integration remains NOT_RUN and R2 activation stays deferred. Security findings from Task 2B.1 remain open; test success does not authorize release.

## 1. Project Information
- Project: SmartFleet Vehicle Usage Web Application
- Baseline Version: v3.8.5
- Target Version: v4.2.0
- Repository: kritsuwan1/smart-fleet
- Test Environment: Isolated Staging
- Production Testing: Read-only checks unless explicitly approved

## 2. Testing Principles
1. Inspect the current source code before writing tests.
2. Reuse existing test frameworks and conventions.
3. Never run destructive tests against Production.
4. Use synthetic or anonymized test data.
5. Verify both success and failure scenarios.
6. Do not mark tests passed without execution evidence.
7. Record failed tests and unresolved issues.
8. Preserve all existing vehicle records.
9. Require approval before Production deployment.

## 3. Test Levels
- Unit Tests: Validation and calculation logic
- Integration Tests: API and database interactions
- End-to-End Tests: Complete user workflows
- Security Tests: Authentication and authorization
- Regression Tests: Existing functionality
- Restore Tests: Database backup and recovery
- UAT: User acceptance testing

## 4. Baseline Regression Tests - v3.8.5

### TC-001: User Login
Steps:
1. Open login page.
2. Enter valid credentials.
3. Submit login form.
Expected: Authorized user can access permitted pages.

### TC-002: Invalid Login
Steps:
1. Enter invalid credentials.
2. Submit login form.
Expected: Login is rejected without exposing sensitive information.

### TC-003: Vehicle Trip Recording
Steps:
1. Select vehicle.
2. Enter required trip information.
3. Submit the record.
Expected: Exactly one valid trip record is saved.

### TC-004: Odometer Validation
Steps:
1. Enter invalid odometer values.
2. Attempt to submit.
Expected: Invalid values are rejected without data corruption.

### TC-005: Trip Save Confirmation
Steps:
1. Save a valid trip.
2. Inspect confirmation screen.
Expected: Vehicle plate, saved time, odometer and detail navigation are correct.

### TC-006: Existing Data Integrity
Steps:
1. Record baseline counts and checksums.
2. Execute tests on isolated staging data.
3. Compare preserved historical records.
Expected: Existing historical records remain unchanged.

## 5. Security and Backup - v3.8.6

### TC-101: Scheduled Backup
Expected: Backup executes at the configured schedule.

### TC-102: Backup Retention
Expected: Retention follows the approved policy.

### TC-103: Backup Integrity
Expected: Backup artifact is complete and readable.

### TC-104: Database Restore
Expected: Backup restores successfully to an isolated test database.

### TC-105: Unauthorized Backup Access
Expected: Non-Admin users cannot access backup data or operations.

### TC-106: Backup Failure Handling
Expected: Failed backups are logged and notification is triggered.

### TC-107: Maintenance Verification
Expected: Existing maintenance reminders behave according to verified requirements.

### TC-108: Secret Protection
Expected: No credentials or private secrets are exposed in logs, code or backup downloads.

## 6. Mobile UX/UI - v3.9.0

### TC-201: Responsive Layout
Expected: No unintended horizontal overflow at 360px, 390px, 768px and desktop widths.

### TC-202: Mobile Trip Entry
Expected: User can complete the full trip workflow on a mobile device.

### TC-203: QR Code Entry
Expected: QR code opens the correct vehicle workflow.

### TC-204: Duplicate Submission
Expected: Repeated taps do not create duplicate records.

### TC-205: Save Confirmation
Expected: Correct saved values are displayed after submission.

### TC-206: Cross-Browser Compatibility
Expected: Critical workflows function in supported Chrome, Edge and mobile Safari browsers.

## 7. Dashboard and Reports - v4.0.0

### TC-301: Dashboard Summary
Expected: Total trips and distance match the underlying records.

### TC-302: Date Filtering
Expected: Filters return records within the selected date range.

### TC-303: Driver and Vehicle Filtering
Expected: Results match the selected driver and vehicle.

### TC-304: PDF Export
Expected: PDF opens correctly and includes accurate report data.

### TC-305: Excel Export
Expected: Excel opens correctly and contains accurate records.

### TC-306: Empty Data
Expected: Dashboard and reports handle empty results without errors.

## 8. User and Permission Management - v4.1.0

### TC-401: Admin Access
Expected: Admin can access authorized administration features.

### TC-402: Staff Access
Expected: Staff can access only permitted functionality.

### TC-403: User Access
Expected: User can access only permitted personal records.

### TC-404: Pending Approval
Expected: Unapproved accounts cannot access restricted pages or APIs.

### TC-405: Unauthorized API Access
Expected: Requests without required permissions are rejected.

### TC-406: Account Deactivation
Expected: Deactivated accounts cannot continue accessing protected resources.

### TC-407: Audit Logging
Expected: Important administrative changes are logged with appropriate metadata.

## 9. Multi-Vehicle Management - v4.2.0

### TC-501: Vehicle Creation
Expected: Authorized Admin can create a valid vehicle record.

### TC-502: Vehicle Data Isolation
Expected: Trips and odometer histories remain associated with the correct vehicle.

### TC-503: Vehicle QR Code
Expected: Each QR code identifies the intended vehicle.

### TC-504: Conflicting Trips
Expected: Conflicting active trips are rejected according to approved business rules.

### TC-505: Historical Migration
Expected: Existing vehicle 8กน3362 Bangkok records are preserved.

### TC-506: Multi-Vehicle Reports
Expected: Individual and combined reports calculate correctly.

## 10. Required Test Evidence
For each test run, record:
- Test ID
- Version and commit hash
- Environment
- Execution date
- Test result: PASS, FAIL, BLOCKED or NOT_RUN
- Relevant command or test method
- Error summary when applicable
- Evidence location

## 11. Release Acceptance Criteria
A release may be proposed only when:
1. Build succeeds.
2. Required automated tests pass.
3. No unresolved Critical or High security issues remain.
4. Critical business workflows pass UAT.
5. Existing historical records remain intact.
6. Backup and recovery requirements are verified where applicable.
7. Database migrations are tested on staging.
8. Rollback procedures are documented.
9. Production deployment receives explicit approval.

## 12. Deployment Safety
- Never automatically deploy Production during development.
- Never execute destructive migrations against Production.
- Never use Production credentials in staging.
- Never copy personal data into public test artifacts.
- Stop and request approval when a required operation could affect Production.

## 13. Test Reporting Template

Version:
Commit:
Environment:
Execution Date:
Tests Passed:
Tests Failed:
Tests Blocked:
Tests Not Run:
Known Issues:
Migration Required:
Rollback Plan:
Production Deployment Approved: NO

## 14. Current Test Status
Baseline verification: NOT_RUN
Batch 1 tests: NOT_RUN
Batch 2 tests: NOT_RUN
Batch 3 tests: NOT_RUN
Production deployment: NOT AUTHORIZED

## 15. Next Action
1. Inspect the actual source code and test infrastructure.
2. Map test cases to existing modules.
3. Identify missing automated tests.
4. Update ARCHITECTURE.md and PROGRESS.md.
5. Begin development on an isolated branch.

## 16. Task 2A - Automatic Backup development verification

The earlier NOT_RUN statuses describe the original planning snapshot. Current execution results are recorded in PROGRESS.md; mock/offline results do not imply a real R2/D1 or scheduled deployment was tested.

New suite: tests/automatic-backup.test.mjs, appended to npm test (13 suite files total). Uses synthetic state, in-memory SQLite, an R2 mock, mocked notifications and both built Worker variants.

| Case | Automated coverage |
| --- | --- |
| AB-001 / TC-101 | UTC cron constant and Bangkok date boundary; default-off handler; separate build/binding/environment markers |
| AB-002 / TC-103 | Full state and unknown legacy fields preserved, source version/counts/bytes metadata, SHA-256 of state and envelope, corrupt metadata/body/reference rejection |
| AB-003 | Immutable daily object, duplicate invocation, concurrent jobs, active/expired/stolen token leases, ambiguous successful put acknowledgement |
| AB-004 / TC-102 | Paginated retention, today plus six previous dates, exact boundary, environment/unrelated-key isolation, sole last-valid-copy preservation when new upload fails |
| AB-005 / TC-106 | Transient and persistent R2 failures, bounded retry count, read-back missing/corrupt, list/delete failures, D1 status failure fallback, retry from an existing valid artifact |
| AB-006 / TC-105/108 | Admin 200/employee 403/anonymous 401 status access, no authentication fields in status, raw failures/secrets excluded from logs and notification payloads, notification failure/unconfigured outcomes |
| AB-007 / TC-104 | Actual SQLite restoration into empty Demo-marked target, full normalized state equality/session rotation, production/occupied/corrupt targets rejected before writes, production-source-to-staging restore |
| AB-008 / TC-006 | Source main payload AND version unchanged after backup success/failure; missing main is never initialized |
| AB-009 | Offline CLI rehearsal uses a local temporary private fixture and in-memory DB; output excludes state/session/account secrets |

Before Staging activation (NOT_RUN in Task 2A):

1. Verify actual R2 bucket privacy, IAM/bindings/environment separation and absence of unsafe object lifecycle rules.
2. Run approved Staging cron and verify the actual 02:00 Asia/Bangkok timestamp; test provider retries, storage latency/timeouts and a process killed before status completion.
3. Inject Staging R2/D1/webhook failures, verify redacted provider logs, last-success-age monitoring and failure delivery.
4. Execute the documented empty-Staging-D1 recovery drill and compare historical trip/odometer/account integrity.
5. Review BackupPanel in a browser including disabled, never, running, success, failed and unavailable states.

No Production trigger/resource/configuration change, deployment, merge, migration or real restore is authorized by these tests.

## 17. Task 2A automated execution evidence

2026-11-01: Windows Node v24.22.1 build/typecheck/test PASS; then actual [Linux CI run 41275329310](https://github.com/kritsuwan1/smart-fleet/actions/runs/41275329310) on Ubuntu 24.04.5 / Node v24.22.0 passed npm ci, build, typecheck and all 13 test files, including AB-001 through AB-009 assertions in automatic-backup.test.mjs. Tested source commit: deeefc5ea498a7c3e564f702073eb830f84aaf88. Details and limitations are in PROGRESS.md.

These are mock/offline integration results. Real Staging R2/cron/webhook/D1 restore and browser UAT remain NOT_RUN; no production release or activation is implied.

## 18. Task 2C.3 — No R2 subscription / offline coverage

Reuse the existing bucket() Map mock and independent SQLite :memory: databases in automatic-backup.test.mjs. Run npm run test:backup:offline (build plus the existing backup suite); npm test still runs all 13 suites. See [BACKUP_OFFLINE.md](BACKUP_OFFLINE.md).

- AB-010: compare both state and envelope digests to independent Node crypto SHA-256.
- AB-011: create nine valid previous daily artifacts, create today's copy and assert exactly the seven current-window copies remain, validating each retained artifact.
- AB-012: inspect all repository Wrangler configs and backup examples for empty/absent cron lists and disabled/absent enable flags. This does not query deployed Cloudflare settings.
- Existing AB-001–009 cover failure injection, final-valid-copy retention, source preservation, redaction and actual offline SQLite recovery. Production-named scenarios use only synthetic data.

2026-11-01 Windows Node v24.22.1: offline command/build, typecheck and all 13 suites PASS. No R2 bucket, subscription, real D1 or credentials required. Cloud R2 integration and Staging D1 integration remain NOT_RUN. Future cloud provisioning, subscription, secrets, deployment and trigger activation each require explicit approval; no activation is implied by these results.
