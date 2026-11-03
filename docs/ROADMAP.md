# SmartFleet Development Roadmap

Updated 2026-11-03 (Asia/Bangkok), Task 3D.1. Repository kritsuwan1/smart-fleet; active branch dev/smartfleet-batch-1. App label/baseline v3.8.5; targets remain v3.8.6 through v4.2.0, without assigning a deployment/release date.

## Owner direction and boundaries

**ACTIVE: application features and synthetic offline/local testing. DEFERRED: Operator setup, Cloudflare live verification, Staging D1 initialization and deployment.** R2 subscription/integration, real Cron and external failure notifications stay deferred/off. No credentials/tokens, Cloudflare API/resources, actual DB, Production/Demo changes, Initialize/Deploy/Merge or public routes are authorized. Existing security and environment guards remain mandatory.

An offline regression PASS is not operational verification. Deferred work is not PASS and is not a prerequisite for continuing local feature work. Resuming it requires a separately scoped owner instruction and the still-unmet safety approvals.

Source-backed feature status, confirmed D1/D2 defects and risks: [FEATURE_AUDIT_3D1.md](FEATURE_AUDIT_3D1.md). Tests/acceptance: [TEST_PLAN.md](TEST_PLAN.md). Prior historical requirements are refined below because trip, report, maintenance and multi-car core code already exists; do not rebuild these features from scratch.

## Current baseline

| Area | Current state | Next gap |
| --- | --- | --- |
| Checkout / return | IMPLEMENTED core | Same-task submit/lost response/concurrency UI assurance, car setup bound consistency |
| Maintenance / expiry | IMPLEMENTED current date/km/either dashboard scope | Browser completion, owner-defined calendar/expiry enhancements if needed |
| No-R2 backup/recovery | PARTIAL | D1 semantic validation, repeatable local recovery evidence; durable cloud automation deferred |
| Dashboard / monthly PDF | PARTIAL | Trends/ranges/maintenance costs, browser-rendered PDF acceptance |
| Mobile | PARTIAL | Whole critical-flow browser matrix and failure UX |
| Admin / Staff / User | PARTIAL | Only Admin/Employee exist; Staff/User/onboarding policy missing |
| Multiple vehicles | PARTIAL | Car input bounds, dynamic per-car QR, wider isolation/concurrency acceptance |
| Success confirmation | PARTIAL | Detailed start/return receipt exists; uncertain transaction handling and other-action requirements |

## Prioritized application batches

No work below is started by this documentation audit. Each implementation task must retain the current branch/security constraints and the no-cloud owner decision.

### 3D.2 — Data-validation consistency (P1, recommended next)

Goal: fix the two locally reproduced input/backup defects without changing valid trip rules or stored data.
- D1: reject invalid backup chronology and invalid calendar/odometer data consistent with existing Trip semantics; retain valid checksummed/legacy backups and optional Maintenance fields.
- D2: align new/edited Car initialOdo client/server validation with existing Trip bound 0–99,999,999 and integer requirements.
- Report rejected records clearly; no repair, clamp, filtering, deduplication, migration, new restore endpoint or writes to real data. Initial-odometer edits on existing historical vehicles require a separate policy if that behavior needs changing.

Acceptance: D1 sample (10:00 departure / 09:00 return) rejected; impossible calendar dates and malformed open/closed odometers rejected; valid date/odo boundaries accepted; 100,000,000 initialOdo rejected without a write; existing valid car/trip/maintenance/account/audit data identical before/after failed requests/inspection. Existing backup/SQL restore/import/roles/Maintenance regressions and Windows/Linux build/typecheck/tests pass. Scope checks must not silently tighten unrelated valid business behavior; stop for owner decision if compatibility changes are needed.

### 3D.3 — Reliable submit and truthful confirmation (P1)

Goal: harden the existing flows rather than invent another transaction/security framework.
- Reuse the synchronous submit guard approach already in Maintenance/Profile where appropriate.
- Handle slow requests, two submit events in one task, out-of-order replies, 401/409 and commit-then-lost-response.
- Show success only for the specific successful server result; uncertain outcome must offer refresh/reconciliation, not fabricate a receipt or auto-post a duplicate.

Acceptance: one client request for same-task double submit; server CAS/ownership still enforced; no stale error overwrites a later confirmed success; failed/unknown save never claims success. Known successful start/return receipt retains exact car/trip ID/time/odometer. Separate tabs remain safe under existing version guards. Adding durable request IDs/Fleet fields is not assumed: design/backward-compatibility approval first if required.

### 3D.4 — Role and onboarding contract, then scoped implementation (P1 decision)

Owner must define Admin/Staff/User capabilities, legacy Employee mapping and whether signup requires Admin approval/invite/verified driver linkage. Existing immediate active self-registration/name matching is a high attribution risk if public signup is unintended; make this decision before wider onboarding.

Acceptance before code: explicit route/action/data matrix and compatibility examples approved; no automatic relabeling of Employee. Future tests: direct API and UI authorization for each role, no self-promotion, disabled/pending login, unauthorized Person claiming, scope/backup/Maintenance access, session invalidation, preservation of historical ownerUserId/driverId. Any data-shape/schema/business-rule change needs separate approval. This app authorization work is distinct from deferred Cloudflare Operator infrastructure.

### 3D.5 — Mobile and local browser acceptance (P1/P2)

Scope: checkout → return → receipt/history, Maintenance/history correction, profile, PDF and no-R2 backup at 360/390/768/1280 with long Thai content. Use synthetic local data and block external navigation/network; no live Worker or provider.

Acceptance: no document-wide horizontal overflow, reachable/tappable controls, keyboard/focus/Escape/cancel and orientation checks; double-submit/slow/offline/401/409 outcomes correct; Admin/Employee UI follows API policy. Validate real browser font/PDF generation and download-failure messages. Record tested browser/version/viewport and injected-identity limitations. Physical iOS/Safari acceptance remains separately NOT_RUN until actually tested; do not infer it from Node/static rendering.

### 3D.6 — Dashboard and report completeness (P2)

Agree product scope for trends, date-range and Maintenance costs before coding. Reuse existing per-car/month/employee dataset and one-page PDF rather than replacing proven calculations.

Acceptance: deterministic totals for empty/open/closed/cross-month/multi-car data; no other-user leakage; correct Thai/Buddhist labels; missing fuel data stays explicitly unavailable, not replaced with another month/product. PDF visual/glyph/clipping tests complement byte/xref tests. Searchable/multipage PDF is a product decision, not an assumed requirement for the existing summary.

### 3D.7 — Multi-car completion and safe QR (P2)

Reuse current cars[]/carId separation. Design per-car QR/entry origin allowlist for a future approved environment; no deployed Production/Demo assets or public URL are changed now.

Acceptance: independent odometers/occupancy/reminders/history/report selection across two or more synthetic cars; duplicate plate/province and deactivation of an occupied car refused; archived cars retain history; simultaneous independent requests respect shared-state CAS without data loss. Proposed QR resolves to the exact selected car/environment and refuses unintended hosts; real URL verification remains deferred.

## Deferred operational queue — not an active development batch

| Work | Status | Conditions to revisit |
| --- | --- | --- |
| Operator/host/public register/credential/non-sync durable storage setup | DEFERRED, actual NOT_VERIFIED | Owner resumes and approves host/identity/scope/storage; never request credentials in chat |
| Cloudflare Account/D1 live read-only verification | DEFERRED, actual NOT_VERIFIED / Live NOT_READY | Reviewed real authenticated transport and separate Staging/Recovery approvals |
| Staging D1 initialize and remote restore | DEFERRED, NOT_APPROVED / NOT_RUN | Fresh verified identity/schema, separate write approval and synthetic-only plan |
| Staging or Production deployment / merge | DEFERRED, NOT_APPROVED | Explicit future owner request plus applicable release/security gates |
| R2 subscription/resources, scheduled backup/Cron, external notifications | DEFERRED / activation OFF in repo examples | Separate cost/resource/credential/trigger approval; real provider state not inspected |

Existing offline signature/broker/operator tests remain regressions. They do not change these statuses, enable Live or authorize a cloud operation. No background job or reminder is created by this roadmap.

## Release themes retained

| Original target | Refined intent after audit |
| --- | --- |
| v3.8.6 | Data integrity, existing backup/Maintenance safety and app authorization; actual cloud backup delivery deferred |
| v3.9.0 | Reliable mobile transactions, confirmations and browser acceptance |
| v4.0.0 | Dashboard trends/range/maintenance reporting beyond implemented monthly summary |
| v4.1.0 | Owner-approved Staff/User/onboarding/access matrix and compatible implementation |
| v4.2.0 | Multi-car/QR/comprehensive acceptance beyond implemented core |

These are planning themes, not new release tags or proof of deployed versions. Existing records, particularly historical trips, must remain intact. Adding another vehicle alone does not require SQL normalization.

## Common acceptance and regression policy

Read AGENTS/source/docs, work only on Development, use synthetic memory/SQLite/local Worker tests and preserve complete snapshots on refusal. For executable changes run build/typecheck/all available suites on Windows and Linux Node 24; for docs-only changes use appropriate local checks and accurately reference the unchanged Linux baseline. No lint script exists. Current baseline: 22 suites PASS; discovered D1/D2 safety criteria FAIL and require new assertions, so suite PASS does not close them.

Keep tests for trip continuity/overlap/ownership, backups/checksums/session rotation, maintenance rollback/manual overrides, role filters, imports and multi-car isolation. Do not delete or weaken security tests/allowlists because their live operation is deferred. Record results/limits in PROGRESS; owner approvals remain necessary for business/shape/schema changes or operational actions outside a task's scope.
