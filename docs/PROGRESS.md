# SmartFleet - Development Progress

## Project and audit baseline

- Baseline: v3.8.5; target: v4.2.0; repository: kritsuwan1/smart-fleet.
- Branch: `docs/smartfleet-master-plan`; audit date: 2026-11-01 (Asia/Bangkok).
- Audited commit: [45f01a17dff015475aebf78862cacef617046ed8](https://github.com/kritsuwan1/smart-fleet/tree/45f01a17dff015475aebf78862cacef617046ed8).
- `package.json` and `src/version.ts` both declare 3.8.5. This verifies source version only; production baseline remains owner-reported, not remotely verified.
- Read `AGENTS.md`, ARCHITECTURE, PROGRESS, ROADMAP and TEST_PLAN first; inspected source, dependencies/lockfile, all three SQL schemas, tests/fixtures, scripts, Wrangler configs and the sole GitHub workflow.
- Changes authorized/performed: only `docs/ARCHITECTURE.md` and this file. No source/test/config/DB/environment changes, deployment or merge.

Status: IMPLEMENTED means code exists; LOCAL_PASS means listed local checks passed; PLANNED means missing/planned work; UNVERIFIED means no acceptance evidence. No roadmap release is marked COMPLETED or DEPLOYED by this audit.

## v3.8.5 findings against ROADMAP

Paths below refer to the audited snapshot; detailed architecture and limitations are in [ARCHITECTURE.md](ARCHITECTURE.md).

| Area | Evidence and observed capability | Status / remaining gap |
| --- | --- | --- |
| Authentication | `auth.ts`, `worker.ts`; password hashing, signed cookies, rate limits, origin/security headers | IMPLEMENTED / LOCAL_PASS for covered cases; no complete security sign-off |
| Server authorization | `api.ts`, `auth.ts`; admin management, employee-owned trips, redacted state, session invalidation | IMPLEMENTED / LOCAL_PASS; Admin/Staff/User tiers and new-account approval absent |
| Trip recording | `fleet.ts`, `api.ts`; start/return, date/integer/odometer/overlap checks, version conflicts | IMPLEMENTED / LOCAL_PASS; no explicit idempotency token or browser retry acceptance |
| Save confirmation | `TripSaveConfirmation.tsx`, `trip-receipt.ts`; exact server-returned record, plate, event time, odometer, detail | IMPLEMENTED / LOCAL_PASS; separate saved-at timestamp absent |
| Manual backup | `worker.ts`, `backup.ts`, `BackupPanel.tsx`; admin SQL/JSON download, SHA-256/structure checks | IMPLEMENTED / LOCAL_PASS; full backups include private authentication material |
| Restore | `check-sql-backup.mjs`, `backup-alerts`, `accounts`, `environments` tests; offline SQL restore and session rotation | LOCAL_PASS in memory only; isolated Cloudflare staging restoration UNVERIFIED |
| Automatic backup | No scheduled handler, cron configuration, backup-storage binding or backup workflow | PLANNED: destination, daily schedule, retention, monitoring, retries, notifications |
| Vehicle maintenance | No maintenance model/API/settings/tests; only open-trip duration warning in `OpenTripsPanel.tsx` | PLANNED / NOT IMPLEMENTED: maintenance history, due thresholds, reminders and reports |
| Mobile UX | `EmployeeDashboard`, `JourneyForm`, history/detail/profile/receipt components and responsive CSS | IMPLEMENTED / static-render checks LOCAL_PASS; device/browser/overflow acceptance UNVERIFIED |
| QR entry | Static site and car-1 QR assets, print page, query handling/login return | IMPLEMENTED; physical scan/login flow UNVERIFIED; dynamic QR per vehicle absent |
| Dashboard/reporting | `App.tsx`, `MonthlyReport.tsx`, `report.ts`, `export.ts`; counts/distance, monthly metrics, filters, PDF/XLSX | IMPLEMENTED; reports suite blocked on Windows; rendered export UAT UNVERIFIED; charts, date range and maintenance content missing |
| Account administration | `api.ts`, `AccountPanels.tsx`, `ProfilePanel.tsx`; promote/demote, deactivate/reset, own-password change, audit | IMPLEMENTED / LOCAL_PASS; registration immediately active; no Staff tier or pending approval |
| Multi-vehicle | `fleet.ts`, `api.ts`, report/history filters; add/edit/deactivate and car-scoped odometer/overlap rules | IMPLEMENTED foundation; full multi-car/historical-preservation UAT and per-car QR missing |
| Database/deployment | D1 single JSON main row, version checks; separate Demo/Production builds and guards; manual deployment workflow | Code verified, environments/deployed configuration UNVERIFIED; no production access performed |

Do not implement existing functions again just because ROADMAP assigns them to a future release. Maintenance and automatic backup must not be inferred from the word “alerts” in the existing test name.

## Local validation evidence

Environment: Windows PowerShell, Node v24.22.1, fresh branch clone at the SHA above. All Worker calls were direct function calls with local Request objects and in-memory SQLite mocks; no production HTTP or database testing.

Dependency installation used `pnpm.cmd dlx npm ci --no-audit --no-fund` because npm was not on PATH. It installed the locked dependencies; npm reported blocked dependency install scripts. The available esbuild binary nevertheless built both variants successfully. No manifest/lockfile change resulted.

| Command / check | Result | Evidence / limitation |
| --- | --- | --- |
| `node build.mjs` (package build script) | PASS | Demo 957895 bytes; Production 956526 bytes. Initial sandbox run denied ancestor-directory access; rerun outside sandbox passed |
| `node node_modules/typescript/bin/tsc --noEmit` (typecheck script) | PASS | Exit 0 |
| `pnpm.cmd dlx npm test` | FAIL / environment portability | Worker suite passed, then import suite exited 1 with ERR_UNSUPPORTED_ESM_URL_SCHEME, protocol c: |
| Remaining test files run individually with `node --experimental-sqlite tests/<name>.test.mjs` | 9 PASS, 1 blocked | Reports has the same Windows path-import error; results below |
| Lint | NOT_AVAILABLE | No lint script in package.json |
| Device/browser E2E, real staging D1 restore, production checks | NOT_RUN | Outside this documentation audit's executed checks |

Per-file result across all 12 test files: **10 PASS; 2 execution failures caused by Windows path imports**. This is not an all-green npm test result.

| Test file | Result | Verified scope |
| --- | --- | --- |
| `worker.test.mjs` | PASS | Auth/assets/origin/session, 17-row import, conflicts, trip overlap/odometer, persistence, SQL restore, rate limit |
| `import.test.mjs` | BLOCKED (exit 1) | Dynamic import of absolute Windows path; test assertions not fully executed |
| `accounts.test.mjs` | PASS | Registration, employee isolation, driver spoof rejection, ownership, backups, reset/disable/password sessions, concurrent registration, legacy migration |
| `roles.test.mjs` | PASS | No self-promotion, admin management, promote/demote and session invalidation, audit, role-preserving restore |
| `reports.test.mjs` | BLOCKED (exit 1) | Same unsupported c: import; do not claim report calculations/PDF checks passed this run |
| `system-status.test.mjs` | PASS | Main payload byte limits/counts and admin-only access; not total D1 capacity |
| `backup-alerts.test.mjs` | PASS | JSON checksum/structure/tamper tests, SQL restore empty/populated, session rotation, offline rehearsal and open-trip duration |
| `environments.test.mjs` | PASS | Separate builds/bindings/markers, cross-environment restore protection, offline Demo restore |
| `mobile-ui.test.mjs` | PASS | Static React markup: vehicle states, form bounds/hints, busy controls and escaping |
| `history-ui.test.mjs` | PASS | Combined filters/counts, detail/status actions, escaping and empty state |
| `profile-ui.test.mjs` | PASS | Password form/request errors, masked fields and root-admin path |
| `trip-receipt.test.mjs` | PASS | Server ID/normalized values, conflicts/validation, Thai event time and immutable receipt |

`import.test.mjs` and `reports.test.mjs` use `import(tmp + '/...mjs')` instead of a file URL. No test files were patched. Re-run the untouched full suite in its Linux CI environment or fix portability in a separately authorized source batch. Existing workflow definition is not evidence that CI has run successfully for this audit.

Test-plan mapping: local evidence partially covers TC-001–005, TC-103–105, TC-108, TC-202/204/205, TC-303, TC-401/405–407 and TC-501/502/504. None of these mappings replaces full acceptance/UAT. TC-101/102/106 are missing implementation; TC-107 has no maintenance module; TC-201/203/206, rendered exports and real historical-data/staging recovery checks remain NOT_RUN. TC-402/404 require missing Staff/approval features. TC-108 needs a clarified rule for private full backups, which intentionally contain authentication material.

## Batch 1 - concrete next tasks

Batch 1 remains PLANNED for implementation; this session completed the repository audit only.

### v3.8.6 Security and Automatic Backup

- [x] Inspect current backup and authorization implementation; distinguish maintenance from overdue open trips.
- [ ] Design a private backup destination and least-privilege access; define application-state vs full-D1 recovery scope. Reuse SQL/JSON/checksum code, and protect or remove session material as appropriate.
- [ ] Implement scheduler, durable artifacts and retention. Roadmap proposal: daily 02:00 Asia/Bangkok (19:00 UTC on the preceding calendar day), seven daily copies. No schedule has been configured.
- [ ] Add job history with last success/failure, artifact checksum/count/version, retries and failure notifications; current system status only measures data usage.
- [ ] Verify backup endpoints, stored artifacts and job operations reject unauthenticated/employee access; test session/role revocation and secret redaction. Record the intentional sensitive contents of private restore artifacts.
- [ ] Resolve immediate self-registration/name-linking trust and approval requirements; preserve account/driver links and existing records. Keep three-role expansion aligned with v4.1.0.
- [ ] Restore a synthetic/anonymized backup into an isolated staging D1; compare entities, odometer history and accounts; test partial/corrupt artifacts, environment guards and session rotation. Local SQLite success is a prerequisite, not staging acceptance.
- [ ] Define maintenance requirements (service history, time/km intervals, reminder ownership/channels) and scope the missing module before implementation; TC-107 cannot be accepted as currently assumed.
- [ ] Obtain a full green automated run on a supported environment, complete staging security/restore UAT, and document release/rollback evidence.

### v3.9.0 Mobile UX/UI

- [ ] Reuse existing dashboard/form/history/profile/receipt components; test 360, 390, 768px and desktop for unintended page overflow, keyboard, modal focus, fixed navigation and long Thai text.
- [ ] Test real Android Chrome and iPhone Safari start/return/occupied-car/validation/expired-session/offline paths; retain desktop behavior.
- [ ] Exercise QR -> login/register -> correct vehicle -> start/return, including occupied/inactive/unknown cars. Plan dynamic QR generation for additional vehicles.
- [ ] Verify rapid taps, concurrent devices, stale versions and timeout/retry behavior; add request idempotency only if needed after defining expected retry semantics.
- [ ] Verify confirmation against the persisted server record: plate, event time, odometer and detail; define whether “saved time” additionally requires a server commit timestamp.
- [ ] Complete mobile staging UAT; static rendering alone does not meet responsive acceptance.

## Later batches: reuse and remaining scope

- v4.0.0: reuse summaries, month/car/driver filters, XLSX and monthly PDF; add monthly usage charts, date-range filtering and maintenance reporting; validate output in actual PDF/Excel viewers and compare calculations to records.
- v4.1.0: reuse admin/employee permissions, account editing/deactivation, sessions and audit; add approved Admin/Staff/User model and registration approval, with direct-API regression tests.
- v4.2.0: reuse existing multi-car structures and per-car validation/report filters; add generated vehicle QR, exercise simultaneous independent vehicles, and verify historical 8กน3362 records in staging before any migration decision.

## Session history and safety

### 2026-11-01 - Master plan preparation

Roadmap, architecture draft, progress tracker and test plan established. No production changes authorized.

### 2026-11-01 - Evidence-based repository audit

- Replaced architecture assumptions with verified stack, JSON/D1 layout, routes, permissions, backup scope, maintenance absence and deployment boundaries.
- Recorded 10 passing local suites and two Windows execution failures; no source/test fixes were made.
- Changed files: only `docs/ARCHITECTURE.md` and `docs/PROGRESS.md`. Audit commit is the commit containing this entry; the source snapshot SHA is pinned above.
- No Cloudflare scripts, SQL against remote databases, deployment workflow, secret changes or merge performed.
- Production v3.8.5 deployment remains UNVERIFIED; v3.8.6 through v4.2.0 are not declared released by this audit.
