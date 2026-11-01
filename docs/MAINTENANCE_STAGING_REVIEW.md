# Task 3B — Maintenance review and Staging readiness

Date: 2026-11-01. Branch: dev/smartfleet-batch-1. Review baseline: be44cd58e33ed0bcc085469c9dea9b2b84179bea. Read AGENTS.md and all eight docs files. Task 3A implementation 338580ff118f1f3afac52ff2f09002164b2bee99 is complete; latest prerequisite Linux run 41282614540 succeeded with all 14 suites. The subsequent baseline commit changes progress evidence only.

**Decision: NOT READY for Staging deployment approval.** Development regression checks pass, but history editing is missing and the setup/security gates below remain unresolved. No deployment is performed or requested by this report.

## Review results

| Check | Result | Evidence / limits |
| --- | --- | --- |
| Date-only, km-only, either criterion | PASS | Nine-case automated matrix plus Task 3A threshold/Bangkok tests; earliest urgent criterion wins |
| Normal / near / overdue | PASS | Exact km threshold is overdue; date due today is near, yesterday is overdue; existing semantics retained |
| Admin add/edit/disable plans and record service | PASS | Actual fleetApi with SQLite; browser Dashboard adds/edits a plan and records 123.45 baht as 12345 satang |
| Employee permissions | PASS | API rejects writes, redacts history/costs and now filters inactive plans/cars at response boundary; browser shows no maintenance write controls |
| Create/read maintenance history | PASS | Browser details/history, SQLite assertions and prior backup/recovery regression |
| Edit existing maintenance history | FAIL — NOT IMPLEMENTED | Only plan/complete operations exist; editHistory returns 400 without changing history. This is a missing feature, not an automated regression. No new edit workflow was invented during review |
| Rapid double submit | PASS | Two same-task form submit events generate one request, tested for plan and service forms with a delayed backend |
| Concurrent requests / stale versions | PASS | Two actual API writes against one version result in 200/409 and one plan; stale-write regression retains state |
| Retry with a fresh version after lost response | PASS for exact matches after fix | Recurring completion previously accepted a duplicate (regression reproduced: 200 instead of 400). Server now rejects identical same-plan/date/odometer/details/cost service records and identical normalized plan configurations. Does not provide a general request-ID idempotency protocol |
| Mobile / wider responsive layout | PASS within tested browser | Edge headless 156.0.4314.58, CSS viewports 360/390/768/1280; document width equals viewport. At 360 tested empty Dashboard, plan form, completion form, history and Employee Dashboard; inputs filled and submit actions completed |
| Legacy Fleet State | PASS | Missing fields accepted without eager migration, existing car/trip/import data and optional maintenance fields preserved |
| SQL/JSON/automatic offline recovery | PASS | Synthetic SQLite backup/recovery regression; no remote D1/R2 certification |
| Real Staging D1, real session/access setup, physical mobile Safari | NOT_RUN | Browser harness injects identity and runs loopback + SQLite only; existing Worker auth tests pass separately |
| Dependency security gate | FAIL / OPEN | npm ci still reports High 3 / Low 1 from Task 2B.1; no package upgrade/force fix performed |
| R2 / Cron activation | OFF in repository / NOT_RUN on provider | Existing no-cron/default-off assertions pass; no provider resources/settings queried or changed |

## Minimal fixes and test additions

- src/maintenance.ts rejects exact duplicate plans and service records before persistence. Different work/configuration remains permitted; existing stored data is not deduplicated, deleted or migrated.
- src/auth.ts removes inactive plans and plans for inactive cars from Employee API responses, matching the read-only reminder UI. Admin still receives all plans/history.
- tests/maintenance.test.mjs adds date/km/either status matrix, inactive-plan visibility, duplicate retries, concurrent writes and explicit unsupported-history-edit/no-write checks.
- tests/maintenance-browser.mjs is an optional, repeatable local browser review using the real React App, real fleetApi, synthetic identities and SQLite :memory:. It is not a remote authentication test or a replacement for Staging UAT. Browser networking is restricted to the loopback harness origin.

## Actual execution

Windows x64, Node v24.22.1: npm ci PASS (44 installed packages); npm run build PASS (Demo 992600 / Production 991226 bytes); npm run typecheck PASS; npm test PASS, all 14 suites. The extra concurrent-write assertion also passed after it was added. Commands used the host bundled pnpm dlx npm launcher; npm dependency-script warnings remain unchanged and no script approvals were changed. No lint script exists. Linux post-commit evidence is recorded in PROGRESS.md when available.

Browser command (Node 24):

```text
node --experimental-sqlite tests/maintenance-browser.mjs .qa/browser/node_modules/playwright "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"
```

Playwright 1.64.1 is installed only under ignored .qa/browser, not added to package.json/package-lock.json. On another machine, provide an independently installed Playwright path and compatible browser executable; omit the executable argument to use its installed Chromium. The optional test is separate from npm test and is not claimed to run in Linux CI. It emits browser/version/viewport measurements and saves synthetic screenshots under ignored .qa/maintenance-review (plan-360.png, complete-360.png, employee-360.png). Screenshots were visually inspected. The supplied user identities bypass login in this local harness; API role logic is exercised, while authentication remains covered by existing built Worker tests. No physical-device/Safari or remote Staging claim is made.

## Required before approving Staging deployment

1. Define and implement the missing history-correction workflow: Admin-only access, audit of original/corrected values, whether correcting the latest service recalculates due thresholds, how to handle older history, duplicate prevention and concurrency. Preserve existing entries/history; do not silently rewrite vehicle or trip odometers. No SQL schema change is assumed or approved here.
2. Resolve the open development-tool security findings through the separately approved dependency task; any breaking upgrade still needs approval. Successful tests do not satisfy the current no-open-High release criterion.
3. Prepare/review one Staging config for **no R2 subscription**: smart-fleet-staging, new dedicated D1 with placeholder until approved creation, DEMO_DB, backup false, empty cron list and no r2_buckets binding. The existing backup-staging example still requires an R2 binding and is not ready for this no-R2 deployment; do not use it unchanged or create resources during review.
4. Correct/review hardcoded Demo QR/site URLs before Staging user access. Confirm Worker/build/environment marker and access restrictions independently; resource names alone are not isolation. Never use production DB IDs or credentials in Staging.
5. After separate authorization only, provision/check isolated Staging/recovery D1 identities, existing fleet_store structure/demo marker, synthetic test data and Staging-only secrets/access controls. Review a recovery-only adapter/harness; the ordinary app must not initialize the recovery target. No cloud DB harness or actual remote restore is claimed here.
6. Run approved Staging login/role checks, form/network retry/session tests, mobile-browser UAT and synthetic recovery validation. Recheck scope/config and obtain explicit Staging deployment approval. Keep R2 and all scheduled backups off.

No deploy, merge, R2 subscription, bucket, trigger, secrets/environment modification, real DB change or production access occurred. Changes are Development-only code/tests/docs; no schema or vehicle/trip business logic change.
