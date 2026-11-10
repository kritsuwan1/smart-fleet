# SmartFleet - System Architecture

## Task 3D.4D-2 — Policy v1.1 immediate self-account (current)

Q6 now permits immediate User account access without Admin approval; Q7 verified Person linkage remains mandatory for vehicle/history scope. [SELF_REGISTRATION_V1_1.md](SELF_REGISTRATION_V1_1.md) documents additive self-user v3 records, legacy active=false deny fuse/current ACTIVE status, strict mixed-state readers, schema2 JSON backups and unchanged legacy credentials/permissions/history.

Actual registration no longer matches or creates Person; it creates only User and audit under CAS, issues the existing secure session and redirects to /. GET Fleet for User is a minimal self-account DTO with no Fleet/version/history; all Person writes and other protected data denied. React reuses profile/password UI at360px. No new routes, identity proof/link/approval queue, Staff/new-User promotion activation or automatic Employee conversion. Shared backup/SQL guards preserve exact new state/restore rotation; old writers must not share it.27 suites/60 new cases and local Edge360px PASS; exact CI in PROGRESS. Operator/Live/Initialize/Deployment DEFERRED.


## Task 3D.4D-1 — actual runtime account/version exclusion gates

Current shared src/account-compatibility.ts strictly recognizes legacy Admin/Employee (including absent role) and refuses unknown roles, lifecycle fields and unsupported state/account versions. The separate future-v2 metadata validator grants no operational access. Storage guards before lazy writes and rechecks missing-key CAS; writeState/keyed writes guard current/candidate snapshots. Auth/session/root/Fleet projection, API and backup sources share the gate; generated trusted SQL target guards and the offline checker retain strict restore/environment/rotation rules. See [ROLE_ONBOARDING_COMPATIBILITY.md](ROLE_ONBOARDING_COMPATIBILITY.md).

No schema/Fleet migration or existing record conversion; trips/ownerUserId/driverId/cars/audit/Maintenance/ledger preserved. Legacy signup remains its existing Employee behavior; Staff/User/PENDING/signup review NOT_ENABLED. Current guard implementation supersedes the historical3D.4C “no actual gate” status below, not the old deployed binary. Future credentials/root/authoritative lifecycle/mixed-reader cutover remain unimplemented. New164 cases plus prior25 suites =>26 offline suites; exact CI in PROGRESS. Operator/Live/Initialize/Deployment DEFERRED.


## Task 3D.4C — approved Policy v1.0, isolated compatibility spike

Owner approved Q1–Q10 on2026-11-05; current policy record is [ROLE_ONBOARDING_CONTRACT.md](ROLE_ONBOARDING_CONTRACT.md), superseding the historical 3D.4A draft below. Staff own checkout/return/no amendment, all-history/minimized aggregates and Maintenance management; User own history/personal reports/basic reminders; signup pending/Admin exact-Person approval; legacy Employee unchanged.

[ROLE_ONBOARDING_COMPATIBILITY.md](ROLE_ONBOARDING_COMPATIBILITY.md) defines a separate v2/synthetic-only envelope retaining original Fleet/ledger and explicit legacy projection, nullable pending links, status/revision guards, minimized DTOs and transactional memory-SQLite migration/rollback. Node-only scripts/offline-role-compatibility.mjs has no operational imports/CLI/network/real binding/path. Tests use actual backup semantic/maintenance/replay functions without changing them. New suite102 cases, total25 offline suites; app bundle inputs/auth/signup unchanged.

The existing runtime still ignores unsupported lifecycle/coerces non-admin to Employee; only the isolated reader gate refuses v2. No new state is placed in fleet_store.main. Actual reader exclusion, authoritative credential/status adapters, root integration, registration/review UI and activation remain NOT_IMPLEMENTED. Policy approved does not imply runtime readiness; Operator/Live/Initialize/Deployment DEFERRED.


## Task 3D.4A — proposed role/onboarding contract (DESIGN ONLY)

[ROLE_ONBOARDING_CONTRACT.md](ROLE_ONBOARDING_CONTRACT.md) audits the exact 6edfcb7/f51efec executable baseline and separates existing Admin/Employee behavior from the owner's unapproved Admin/Staff/User proposal. It defines action/data scopes, PENDING/APPROVED/REJECTED/DISABLED lifecycle, Admin-reviewed exact Person linkage, historical ownerUserId/driverId preservation, planned route/UI tests and phased compatible migration/rollback.

No runtime behavior or data format changed. Current signup still creates an active Employee and may match Person by name; it does not enforce pending approval. Existing non-admin role coercion and missing status gates make old runtimes incompatible with unreviewed new lifecycle data. Pending nullable driver links also need future backup validation/versioning. Never populate new states or auto-map Employee based on this document. All-history Staff reads must be separate from own-trip write capabilities; current boolean isAdmin UI cannot simply expose all trips safely.

Owner decisions Q1–Q10 include Staff Maintenance/write/PII/export scope, User operational-home/report exceptions, review/identity proof, legacy mapping and versioned rollback. Contract NOT_APPROVED; future migration/code requires separate scope approval. Current 24-suite Windows baseline and exact Linux41953314810 remain PASS; proposed role/state cases NOT_IMPLEMENTED/NOT_RUN. Operator/Live/Initialize/Deployment DEFERRED.


## Task 3D.3 — idempotent checkout/return transactions

[TRANSACTION_RELIABILITY.md](TRANSACTION_RELIABILITY.md): updated checkout/return UI sends stable UUID/kind metadata. API fingerprints payload and scopes operation rows to authenticated actor/Fleet session-key epoch; original result/receipt is replayed only after current authorization and matching-payload checks, with fresh scoped Fleet data. Ledger rows use existing fleet_store IDs trip-operation:v1:<digest>; no Fleet shape/SQL schema change. Operation insert, main optimistic CAS and consistency assertion execute atomically through D1.batch; unavailable batch never falls back to separate writes. Keyed requests use first-primary sessions when available; replays read Fleet after result lookup. Same-ID concurrency/lost acknowledgements do not repeat effective writes.

App synchronous save/pending guards, acknowledged-result validation and JourneyForm uncertainty lock complement server guarantees. Legacy unkeyed requests keep CAS-only semantics. Operational ledger is excluded from main-only Fleet backups, has no pruning, and pending client IDs are memory-only; guarantees do not span restore/key rotation/closed tabs. Rollback requires resolving keyed attempts before an explicitly approved client/server downgrade. SQLite/Miniflare45 scenarios, prior23 suites and a local360px Browser flow PASS; exact Linux evidence is in PROGRESS after publication. Worker/routes/config/schema unchanged; Operator/Live/Initialize/Deploy DEFERRED.


## Task 3D.2 — current validation boundaries

[DATA_VALIDATION_CONSISTENCY.md](DATA_VALIDATION_CONSISTENCY.md): new src/validation.ts shares only the existing Trip timestamp/calendar/chronology/open-closed odometer rules and 0–99999999 integer bound. fleet.ts preserves cross-trip/reference/text/reason policy; backup.ts uses value checks for current/legacy JSON; api.ts and App car input use the same odo bound. No Fleet/SQL shape, Worker/routes/config or stored-data mutation policy changed. Existing automatic-artifact inspection refuses invalid values before the local restore library can write; arbitrary trusted SQL is not validated by JS.

Task 3D.1 audit commit acbc8bf was verified docs-only on the correct branch; D1/D2 defects in its historical sections are now fixed and regression-tested. Windows Node 24 ci/build/typecheck/23 suites PASS, including 163 new cases; exact Linux CI evidence is in PROGRESS after publication. Operator setup/Cloudflare Live/Initialize/Deployment remain DEFERRED and actual cloud behavior NOT_VERIFIED. Remaining app roadmap starts with 3D.3 reliable submit/confirmation.


## Task 3D.1 — current feature architecture and owner direction

**Operator setup / Cloudflare Live / Staging Initialize / Deployment: DEFERRED by owner, actual NOT_VERIFIED; Live NOT_READY.** Current application audit is [FEATURE_AUDIT_3D1.md](FEATURE_AUDIT_3D1.md); active offline/local sequence and acceptance are in [ROADMAP.md](ROADMAP.md). The older Phase 0 audit sections below are pinned historical evidence, not current missing-feature assertions.

Current Development source (cbdc2e3; v3.8.5 label) uses React/React DOM 19.2.6, TypeScript 5.9.3, esbuild 0.28.1 and Wrangler 4.116.0, with Node 24 tests. One D1 fleet_store.main JSON retains cars/people/projects/trips/accounts/audit/fuel prices plus optional additive maintenancePlans/maintenanceHistory; main writes use optimistic version checks. No normalized schema migration or new cloud service is needed for the proposed local validation fixes.

Core checkout/return, per-car date/km Maintenance reminders/history/corrections and persisted start/return receipts exist. Admin/Employee API boundaries exist; Staff/User/onboarding approval do not. Manual SQL/JSON exports and isolated SQLite recovery work without R2; scheduled/R2 code has only mock/local verification and activation remains deferred. Dashboard and monthly per-car/employee image-based PDF/XLSX exist; trends/maintenance reports, dynamic per-car QR and broad mobile browser acceptance remain gaps. This supersedes historical “no Maintenance/no scheduled handler/no push CI” statements only for the present Development snapshot: the Linux test workflow now exists; deployed behavior is unverified.

Two audit probes reproduce a backup semantic-validation gap (end before start accepted with valid checksum) and a Car/Trip odometer upper-bound mismatch. See D1/D2 in the audit; no code fix, schema change or data mutation is part of 3D.1. Maintenance rollback/history correction is currently implemented and covered; do not carry the old Task 3B missing-history finding forward as unresolved.


## Task 3C.2P — Option A offline one-shot verifier

[OPERATOR_OFFLINE_VERIFIER.md](OPERATOR_OFFLINE_VERIFIER.md) records the new synthetic-only one-target/process runner and interactive rehearsal CLI. Private synthetic handles model operator/host/path/ACL prerequisites, exact scope precedes typed confirmation, in-memory pending attempt precedes a maximum four fixed Mock requests, and redacted evidence is checked against a separate fixture receipt. No trusted real bootstrap, persistent operator storage, credentials or HTTP client exists; normal operational invocation fails closed. Tests simulate TLS/redirect/timeouts/proxy/environment/identity/schema/storage/tampering; actual Operator/Auth/TLS/Cloudflare remain NOT_VERIFIED. Option A direction is approved for offline work only; final host/credential/storage approval and Live remain NOT_READY. Existing D1 reserved-schema/SQL/app/config policies unchanged.


## Task 3C.2O — proposed live read-only architecture (design only)

See [LIVE_SECURITY_ARCHITECTURE_REVIEW.md](LIVE_SECURITY_ARCHITECTURE_REVIEW.md). Recommend a short-lived operator-run fixed-target verifier in an agent-isolated Windows session/device (option A), with protected operator identity/bootstrap, private non-sync evidence/attempt state, least-privilege auth and exact HTTPS/SQL controls. A permanent isolated credential broker with Ed25519 approvals (option B) is deferred until delegation or independent signed authorization is required. This recommendation awaits owner decision; no security code, live transport, credential access or live entry point is added.

Task N's signature/registry/replay/Mock implementation remains offline unchanged. It does not prove human identity, host isolation, real TLS or API provenance. Earlier broker/signature/distributed-store prerequisites are conditional on choosing B; essential target/identity/schema/credential boundaries remain mandatory for either route. Actual operator/auth/TLS/API NOT_VERIFIED; Live / Initialize / Deploy NOT_READY. Review, acceptance criteria, residual account-wide read risk and separate Staging/Recovery approval gates are in the linked design.


Task 3C.1: separate staging compilation (output/worker-staging.js) uses DEMO_DB/demo marker, STAGING label, synthetic-only fallback seed and disabled QR routes/UI; Production/Demo configs and QR assets remain unchanged. No-R2/private/disabled-cron examples refer to existing user-reported Staging/recovery D1 names with unverified placeholder IDs. Admin history correction uses existing Audit and optimistic main-row write; failed candidate validation preserves prior state, with manual-plan rollback guards. See [STAGING_READINESS.md](STAGING_READINESS.md). No deployed configuration or SQL schema migration is changed.

## Task 3A current development addition

The pinned Phase 0 sections below remain historical audit evidence. Development now adds optional Fleet maintenancePlans/maintenanceHistory arrays (approved by the user), not new SQL tables. src/maintenance.ts validates per-car plans/history and calculates km/date/either reminder states. Admin-only maintenance actions reuse fleetApi authorization, audit and optimistic main-row versioning. MaintenancePanel renders in both Dashboards, with responsive admin forms/history and read-only employee reminders; auth.ts removes maintenanceHistory from employee responses. Existing trip logic and latestOdo are reused unchanged. Backup validation accepts missing legacy fields and validates present maintenance data; full SQL/JSON/automatic snapshots preserve it. See [MAINTENANCE.md](MAINTENANCE.md) for recurrence, date rules, access, limits and recovery compatibility. No deployment, cloud scheduling or external notification is added; R2 remains deferred.

## Audit scope and evidence

- Audited 2026-11-01 (Asia/Bangkok), branch `docs/smartfleet-master-plan`.
- Source snapshot: [45f01a17dff015475aebf78862cacef617046ed8](https://github.com/kritsuwan1/smart-fleet/tree/45f01a17dff015475aebf78862cacef617046ed8). All source references below refer to this snapshot.
- Read `AGENTS.md` and all four `docs/` files before source inspection. Only this file and `PROGRESS.md` are changed by this audit.
- Evidence is repository code plus local tests, not confirmation of the deployed Worker, Cloudflare settings, production records or physical mobile devices. Execution results and gaps are in [PROGRESS.md](PROGRESS.md).

## Stack and application structure

| Layer | Verified implementation | Evidence |
| --- | --- | --- |
| Browser | React 19.2.6, React DOM 19.2.6, TypeScript/TSX, lucide-react 1.31.0; custom CSS | [package.json](../package.json), [client.tsx](../src/client.tsx), [App.tsx](../src/App.tsx) |
| Build | esbuild 0.28.0; TypeScript 5.9.3; Wrangler 4.92.0; ES2022 browser IIFE and Worker ESM | [build.mjs](../build.mjs), [tsconfig.json](../tsconfig.json) |
| Server | Cloudflare Worker Fetch handler, explicit routing; HTML login/register pages and protected bundled assets | [worker.ts](../src/worker.ts) |
| Storage | Cloudflare D1 binding, SQLite SQL, one shared JSON state with optimistic version checks | [storage.ts](../src/storage.ts), [schema.sql](../schema.sql) |
| Reports | Custom OOXML ZIP writer for XLSX; canvas/JPEG embedded in a one-page landscape A4 PDF; bundled Sarabun fonts | [export.ts](../src/export.ts), [MonthlyReport.tsx](../src/MonthlyReport.tsx), [report.ts](../src/report.ts) |
| Tests | Node assert, Node experimental SQLite in memory, esbuild and React static rendering; CI Node 24 | [tests/](../tests), [deploy.yml](../.github/workflows/deploy.yml) |

Runtime flow: browser React UI -> same-origin Worker routes -> authentication and authorization -> D1 `fleet_store`. No separate API server or ORM is present.

Main frontend modules: `App.tsx` coordinates state, navigation and writes; `EmployeeDashboard.tsx`, `JourneyForm.tsx`, `TripHistory.tsx`, `JourneyDetail.tsx` and `TripSaveConfirmation.tsx` implement trip flows. `ProfilePanel.tsx` and `AccountPanels.tsx` manage accounts; `ExcelImport.tsx`, `xlsx-reader.ts` and `import-plan.ts` handle import; `BackupPanel.tsx` and `SystemStatusPanel.tsx` provide administration.

## Database architecture

All three `schema*.sql` files define only:

```sql
fleet_store (
  id TEXT PRIMARY KEY NOT NULL,
  payload TEXT NOT NULL,
  version INTEGER NOT NULL DEFAULT 0
)
```

| Row ID | Payload and lifecycle | Evidence |
| --- | --- | --- |
| `main` | Entire Fleet JSON; initialized lazily; session signing key added if absent | [storage.ts](../src/storage.ts) |
| `environment` | Plain text `demo` or `production`; environment guard | [environment.ts](../src/environment.ts), [schema-demo.sql](../schema-demo.sql), [schema-production.sql](../schema-production.sql) |
| `auth:<HMAC>` | Login/register/password-change rate-limit expiry; counter in version; periodic cleanup | [auth.ts](../src/auth.ts) |
| `fuel:b7:<month>` | Cached price lookup result and expiry | [fuel.ts](../src/fuel.ts) |
| `restore-<UUID>` | Temporary SQL restore staging row, removed at end of generated script | [worker.ts](../src/worker.ts) |

Logical entities are arrays inside `main`, not SQL tables or foreign keys:

- `cars[]`: ID, plate/province/model, initial odometer, active, optional display/fuel fields.
- `people[]`, `projects[]`: drivers and project names.
- `trips[]`: carId -> cars.id; driverId -> people.id; optional ownerUserId -> accounts.id. Dates are local Thai datetime strings; open trip has empty end and null odoEnd.
- `accounts[]`: linked driverId, admin/employee role, active flag, salted password hash and passwordVersion.
- `audit[]`: actor, action, timestamp, before/after; `fuelPrices[]`: monthly manual references; `imported` and private `sessionKey`.

[Fleet types and validation](../src/fleet.ts) define references and trip rules. Writes replace the full JSON using `WHERE version=?`; stale versions receive HTTP 409 through [api.ts](../src/api.ts). There are no separate per-vehicle databases or SQL constraints for logical relationships. The shared state has an application limit of 1,500,000 UTF-8 bytes and 200 accounts ([limits.ts](../src/limits.ts)); audit growth also consumes that state. System status measures main-payload size, not total D1 storage.

Initial data includes vehicle 8กน3362 Bangkok with initial odometer 115784. Historical import is available but is not proof of current production data. No schema or records were changed by this audit.

## Authentication, permissions and API

[auth.ts](../src/auth.ts) implements root admin login against `APP_PASSWORD`, employee passwords using PBKDF2-SHA256 (100,000 iterations and random salt), HMAC-SHA256 sessions, and an eight-hour `__Host-smartfleet` cookie with Secure, HttpOnly and SameSite=Lax. Account status/passwordVersion is checked on requests; password resets and role changes invalidate prior sessions.

| Route | Access / behavior |
| --- | --- |
| POST `/login`, `/register` | Public with rate limits (10/20 per IP per 15-minute bucket); registration immediately creates an active employee |
| POST `/logout` | Clears cookie; GET renders confirmation |
| GET/POST `/api/fleet` | Authenticated scoped state; POST action dispatcher |
| POST trip action | Employee starts/returns own open trip, cannot spoof driver or edit closed/other users' trips; admin has broader management |
| POST car/person/project/account/import/importExcel/fuelPrice actions | Admin only; rechecks current user and version before writing |
| POST `/api/profile/password` | Authenticated non-root account; current password verified |
| GET `/api/backup.sql`, `/api/backup.json` | Admin only |
| GET `/api/system-status`, `/qr` | Admin only |
| GET `/api/fuel-price?month=...` | Authenticated; fixed upstream monthly diesel source/cache |
| GET app assets/report fonts | Protected; QR SVGs public |

[worker.ts](../src/worker.ts) enforces same-origin POSTs, method/body limits and security headers (CSP, no-store, nosniff, frame denial). [viewForUser](../src/auth.ts) removes password/session fields, hides audit/accounts and other employees' trips from employee views.

Verified limits/gaps:

- Roles are `admin` and `employee`; Roadmap Admin/Staff/User tiers and pending approval are absent. Registration can link an existing driver by matching name; no administrator approval or identity proof is implemented.
- Password minimum is six characters. Tests establish covered authorization cases, not a complete security certification.
- Logout deletes the current browser cookie; sessions are stateless and have no per-session revocation registry.
- SQL/JSON backups deliberately include password hashes, salts and session-signing material. They are unencrypted downloads; checksum verification detects corruption but does not establish trusted origin. Normal API redaction does not apply to full backups.
- Sensitive admin changes are audited, but downloads/login attempts and future scheduled jobs have no dedicated operational audit trail.

## Backup and maintenance

**Manual backup exists; scheduled backup does not.**

[BackupPanel.tsx](../src/BackupPanel.tsx) downloads SQL/JSON and checks JSON locally. [backup.ts](../src/backup.ts) emits format/schema/environment/version/time metadata and SHA-256, validates structure/references/counts and accepts legacy files with an unverified notice.

SQL export in [worker.ts](../src/worker.ts) snapshots only `main`, escapes/chunks strings, stages valid JSON before replacement, checks environment compatibility and rotates the restored session key. It is an application-state backup, not a complete D1 export: auth/fuel-cache/environment rows are not backed up. There is no web restore-write endpoint. [check-sql-backup.mjs](../scripts/check-sql-backup.mjs) rehearses SQL restoration in fresh in-memory SQLite; restore tests cover empty/populated targets and environment guards.

Missing from source/configuration: Worker scheduled handler, cron trigger, remote backup destination, seven-day retention, job status/history, retries, failure notification and staging-D1 recovery evidence. Roadmap 02:00 Asia/Bangkok and seven daily copies remain proposals, not configured behavior. Independent SQL and JSON downloads can observe different versions.

**Vehicle maintenance is absent in this snapshot.** Fleet types, API actions and settings contain no maintenance records, due-date/odometer thresholds, service history or maintenance reporting. [OpenTripsPanel.tsx](../src/OpenTripsPanel.tsx) / [open-trips.ts](../src/open-trips.ts) show elapsed time and a 24-hour open-trip review warning; this is not a service reminder. Fuel reference pricing is also unrelated to maintenance.

## Mobile, reporting and multiple vehicles

- Mobile dashboard, bottom navigation, start/return form, busy/disabled controls, odometer hints, card history and confirmation already exist. CSS has 760px and 360px breakpoints in [journey.css](../src/journey.css), [history.css](../src/history.css) and [receipt.css](../src/receipt.css).
- Save confirmation uses the server-returned trip ID/normalized values and shows plate, trip event date/time, odometer and detail link. It does not display a separate database-save timestamp.
- Optimistic versions plus disabled controls reduce duplicate writes; there is no explicit request idempotency key. Rapid taps, retries and concurrent-device behavior still need browser/staging tests.
- QR assets/print page are static for the site and car-1 (8กน3362), with separate Demo versions. [App.tsx](../src/App.tsx) handles `?car=...&action=start` after login. There is no dynamic per-vehicle QR generation UI.
- Dashboard has trip/distance summaries and per-car status; history filters include month, vehicle, driver and search/status. Monthly metrics and PDF/XLSX paths exist. Monthly trend charts, arbitrary date-range filters and maintenance reports are absent.
- Multi-car arrays, admin add/edit/deactivate, carId-scoped odometer/overlap checks and vehicle report selection already exist. Fleet-wide acceptance, generated QR per car and preservation of deployed historical records remain unverified; a normalized-schema migration is not required merely to add another car.

## Deployment and verification boundaries

[build.mjs](../build.mjs) produces separate Demo/Production Workers with build-time environment selection. Production uses DB; Demo maps DEMO_DB to DB and requires the demo marker. Production tolerates an absent marker for legacy data, so environment protection is not equally strict on both sides. Demo configuration still contains a placeholder database ID; actual staging provisioning was not verified.

The only workflow, [deploy.yml](../.github/workflows/deploy.yml), is manual `workflow_dispatch`, target demo/production, with install -> build -> typecheck -> tests -> existing Worker/binding metadata check -> Wrangler deploy -> unauthenticated login-page check. There is no push/PR CI trigger, scheduled backup workflow, or explicit branch/environment approval gate in this YAML. GitHub settings outside the repository are unknown.

[scripts/prepare-deploy.mjs](../scripts/prepare-deploy.mjs) reads remote binding metadata and creates deployment config; [check-deployment.mjs](../scripts/check-deployment.mjs) checks login HTML only. Neither script nor Wrangler/deployment workflow was executed during this audit. Production deployment/version, secrets, backups, infrastructure and rollback behavior remain unverified.

## Task 2A development addition - not deployed

The earlier sections describe the pinned Phase 0 snapshot. Development now adds src/automatic-backup.ts with a default-off scheduled entry in worker.ts, environment/build/marker guards, private R2 daily artifacts, full-state/envelope SHA-256 validation, D1 token lease and sanitized status rows using the existing fleet_store schema. It does not mutate main during backup. Retention runs only after verified read-back; the latest current-day copy is protected.

Admin-only /api/backup-status feeds BackupPanel. Failure notifications use an optional separately approved HTTPS receiver; no credentials are committed or provisioned. Recovery has no HTTP route and accepts only an empty staging target with the existing Demo marker, rotating sessionKey after restore. See [AUTOMATIC_BACKUP.md](AUTOMATIC_BACKUP.md) for setup/recovery, limits and config examples. All real wrangler configurations and the deployment workflow remain unchanged. Only the test CI step label changes to avoid the old fixed 12-suite count.
