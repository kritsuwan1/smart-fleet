# Task 3D.4C — Offline role/onboarding compatibility spike

2026-11-05, Asia/Bangkok. Development branch dev/smartfleet-batch-1. Owner-approved SmartFleet Role & Onboarding Policy v1.0 is recorded in [ROLE_ONBOARDING_CONTRACT.md](ROLE_ONBOARDING_CONTRACT.md).

**OFFLINE SPIKE PASS; new operational roles/signup NOT_ENABLED. Operator/Live/Initialize/Deployment DEFERRED.** No Cloudflare/real DB/credential access, resources, routes, R2/Cron, Production/Demo changes, initialize/deploy/merge or actual account migration. Mock approval flags are not real identity proof.

## Prerequisite and audited boundaries

Verified 16d00236845deb1bfbe3f5aeb906bc2499cf428a: correct Development HEAD, parent6edfcb7, exactly five docs files. Read AGENTS/current contract/architecture/roadmap/progress/test plan before implementation. All94 source/script/test/package/build inputs matched the remote baseline. No unexpected source changes were accepted.

The baseline uses fleet_store.main JSON, admin/employee coercion, active/passwordVersion, linked driverId and ownerUserId-scoped personal history. Signup is immediately active/name-linked; no lifecycle is enforced. Existing account changes revoke cookies via passwordVersion. Backup SQL/JSON stores main (including private authentication material), validates some account references but not future approval policy; restore changes session-key epoch. Keyed operations bind actor/role/driver/car/payload and atomically persist result+main CAS. Maintenance arrays are optional and existing status/calculation/history logic is reused. No normalized SQL migration is necessary for this experiment.

[tests/role-compatibility.test.mjs](../tests/role-compatibility.test.mjs) demonstrates actual currentUser still maps an injected unsupported staff/PENDING fixture to employee, and old inspectBackup accepts its otherwise valid rehashed backup. These are synthetic probes of the unchanged code, not newly permitted access. Thus an “old-reader compatible” inline active/status patch is UNSAFE; use fail-closed isolation.

## Versioned model — proposal exercised only in quarantine

[scripts/offline-role-compatibility.mjs](../scripts/offline-role-compatibility.mjs) is Node-only and imported only by tests. No CLI, external request client, operator setup, actual binding/path option or app import. It creates its own SQLite :memory: handle, tracked in a WeakMap; callers cannot supply a real DB/connection/path. Its SQL tables are spike_snapshot/spike_ledger/spike_events, **not fleet_store**. It cannot initialize or migrate D1.

Snapshot envelope:
~~~text
format = smart-fleet-offline-role-snapshot
formatVersion = 2
policyVersion = 1.0
syntheticOnly = true
fleet = unchanged legacy Fleet clone (all accounts/trips/people/history/unknown non-security fields)
ledger = unchanged supplied operation-row fixtures
accounts[] = {id, origin: legacy|new, role, status, personId: string|null, revision}
decisions[] = {actorId, subjectId, before, after, at}
~~~

Roles are admin/staff/user/legacy-employee; statuses PENDING/APPROVED/REJECTED/DISABLED. Unknown roles/status/format/keys/revisions are rejected, never Employee by fallback. Legacy role absent/employee gets an explicit compatibility projection legacy-employee; original Account.role, active/passwordVersion and IDs stay byte-equivalent in the Fleet JSON. Legacy Admin stays Admin, disabled stays disabled. **This is a derived synthetic projection, not account conversion.** No source Employee is mapped to User/Staff; attempted conversion in this spike is refused.

All old accounts must remain represented; legacy Person links cannot be changed. Duplicate/unknown links or source security metadata that cannot be interpreted safely refuse the plan rather than silently repair. This conservative refusal is a compatibility-review blocker if encountered in a future inventory, not permission to rewrite actual data. Root admin is outside accounts today; the experiment uses a synthetic managed Admin only, and has no root credential/bootstrap adapter.

New PENDING application has role=user, personId=null, revision0. Name is untrusted input: the helper does not look up or create Person from it. It stores no new password/salt/username provider; future operational registration/credentials are deliberately absent. Only a current APPROVED Admin may review; approval requires an explicit exact active/unclaimed Person ID and a synthetic identityVerified=true assertion. Default approved role is User; separate Admin-controlled role changes can assign Staff/Admin to new synthetic accounts. Rejection stays unlinked and cannot operate. Relink/reopen workflows are outside this spike.

Each access decision increments revision, so old sessions fail even after re-enable; principal resolution reads current status/role/link. Staff/User cannot amend existing trips; return only their own open trip. Legacy Employee retains old narrow amend/personal-report/reminder permissions. Approved Staff gains Maintenance management, all-history read and aggregates, never account management/backup/import/foreign return. Current operational checks/validation remain untouched.

The frozen Fleet and sidecar security projection can differ after synthetic status changes; **never unwrap and send this sidecar state to current auth**, which would ignore it. They are not two competing operational sources of truth. Task3D.4D must choose and enforce one authoritative versioned access model at every actual reader/writer before any integration.

## Exact minimized DTOs

staffReport(snapshot, accountId, revision, month) accepts only an approved Staff/Admin and strict YYYY-MM. It returns:
~~~text
{
  policyVersion, month,
  history: [{id, carId, plate, start, end, odoStart, odoEnd, distanceKm, isOwn}],
  totals: {trips, open, distanceKm},
  cars: [{carId, trips, open, distanceKm}]
}
~~~

History is all trips in the requested departure month across cars. Open-trip distance is null and contributes zero; no per-driver grouping. It deliberately excludes driverId, ownerUserId, driver/account names, project/destination/note/reason, directory, audit, costs, hashes and secrets. isOwn supports own-action UI without exposing another owner. No raw Fleet/Trip spread or actual report endpoint/export is added. Future personal reports remain ownerUserId-scoped under approved Q4; the spike tests capability/preservation, not a new personal-report UI.

basicReminders(snapshot, accountId, revision, existingMaintenanceStatus, today) returns only active plans on active cars:
~~~text
[{id, carId, plate, type, status: normal|near|overdue, dueOdo: number|null, dueDate: string|null}]
~~~
No free-text plan name, intervals, service history, details, provider or costs. Existing maintenanceStatus is injected from the actual bundled source in tests, preserving Bangkok date/km/either semantics. The DTO is new User basic visibility; existing Employee plan projection stays unchanged. Staff management is capability-modeled only; no Maintenance write endpoint is enabled.

## Backup / reader compatibility

- legacyReader accepts only understood legacy Fleet security metadata; it refuses the v2 envelope and any inline lifecycle/unknown role metadata. readDocument(handle,1) uses that gate. readDocument(handle,2) validates v2 or understood legacy. Reader versions outside1/2 fail.
- This is a **tested harness boundary**, not a claim that unmodified old binaries gained a gate. Old runtime refusal in an operational deployment is NOT_IMPLEMENTED and remains a hard activation blocker. No v2 data is written where the old app can see it in this task.
- The spike backup wrapper is smart-fleet-offline-role-backup / backupVersion1 with payload and SHA256; it is not a replacement for the app's schemaVersion1 backups. Unsupported schema/role/status/link and digest mismatches fail before SQLite transactions.
- inspectDocumentBackup requires the existing Fleet semantic inspector as an explicit dependency; the tests use real createBackup/inspectBackup. Valid old/legacy and new quarantined wrappers are covered. Correctly rehashed invalid trip chronology/car odometers still refuse before writes. Missing semantic inspector fails closed.
- inspectLegacyApplicationBackup adds strict legacy security checks before the existing real backup inspector; it is test-only. Operational SQL/manual backups, old envelope support and restore library stay unchanged. Full backups remain private; digest is integrity, not trusted provenance or proof of an Admin decision.
- restoreSynthetic permits only the exact migration candidate corresponding to the synthetic target's current base+ledger. It is a rehearsal, not a general restore tool. No supplied DB, arbitrary SQL or existing-data replacement API is exposed. Schema/full rows/versions/ledger/event snapshots must remain identical on refusal.

## Migration, CAS, failure and rollback

migrationPlan computes source digest/version and an exact candidate/digest without a write. applyMigration recomputes the plan, rejects tampering/staleness/repeated application, then updates only the quarantined snapshot and appends a migration event in one SQLite transaction. Ledger rows are never modified. Fault injection after snapshot update or event insert proves complete rollback. No schema DDL occurs during migration itself.

replaceSynthetic is a trusted fixture-store operation, **not an authenticated production mutation API**. It requires a genuine memory handle, v2 validation, same frozen Fleet/ledger and expected snapshot version. Tests construct independently reviewed concurrent candidates: one commits; stale second and subsequent duplicate Person claims refuse without any partial change. Do not treat a caller-supplied JSON candidate, digest or identityVerified boolean as an operational approval.

rollbackMigration allows only the exact untouched original migration candidate. It returns the original legacy JSON while retaining migration/rollback events and monotonic storage version; ledger/schema stay unchanged. Faults roll back fully. Once a PENDING application/review/access change exists, downgrade is refused: no dropping new accounts/decisions, restoring old active roles, pruning ledger or erasing trips. Forward fix / compatible version is required instead.

A future operational rollout must pause enrollment/transactions, reconcile outstanding keyed requests, inventory explicit legacy accounts and backup formats with synthetic rehearsals first, install a gate that excludes old readers before writing new state, and deploy a matched status-aware frontend/backend/readers. No general live migration or rollback command is supplied or run here. Separate owner approvals remain necessary for real migration/initialize/deploy.

## Transaction and session preservation

replayPrincipal resolves current approved status and session revision, maps only explicit legacy-employee to the existing employee record scope, and checks stored actor/role/driver. Tests then call the actual unchanged tripOperationContext/authorizeOperation, including payload/car/owner rules. Valid same-role/driver legacy replay remains authorized. Disable, stale revision, changed role/driver/owner/payload refuse; original receipt/ledger/history are preserved. Existing45 transaction scenarios still verify atomic duplicate/lost-reply/concurrent return behavior.

Role/status access changes must never create a new operation ID to bypass an uncertain old one. Old-scope receipts cannot grant broader current access. Full runtime enforcement is not delivered by these helpers. Main-only backups exclude the actual ledger and restore changes epoch; cross-restore/cross-tab guarantees and ledger retention remain existing explicit limitations.

## Execution evidence and limits

- New suite:102 cases, npm test total25 suites. Includes role×status denial/allowance, unknown-role refusal, legacy fields/history preservation, null pending/exact-ID claims, no escalation through applicant/unauthorized review, minimized DTO keys/totals, actual old-coercion probe, new/legacy backup semantic/identity refusal, complete SQLite migration/restore/rollback failure snapshots, concurrent review CAS, actual replay guard integration, and a zero external-fetch tripwire.
- Windows x64 Node24.22.1: npm ci PASS (42 installed/audited43, reported0 vulnerabilities; existing esbuild/workerd install-script restrictions retained), build PASS (Demo1008994/Production1007620/Staging1007767 bytes), typecheck PASS, all25 suites PASS including new102, transaction45 and validation163. Operational bundle sizes unchanged. No lint script. Helper is .mjs, so node syntax/runtime tests cover it; project typecheck still covers src only.
- Exact implementation Linux Node24 CI evidence follows publication in PROGRESS; no previous green run is substituted. New policy route/UI/full migration acceptance remains NOT_IMPLEMENTED/NOT_RUN, not satisfied by25 offline suites.
- No new browser/UAT/identity-proof/operator/authenticated cloud/TLS/resource claim. No operational role activation, pending signup, actual account conversion or deployment.

## Proposed Task 3D.4D and remaining blockers

Separately authorize a bounded Development implementation: first enforce version/unknown-security refusal at all real storage/auth/backup boundaries with synthetic tests and no new role activation; then choose/review the authoritative versioned account/credential layout and matched read/write adapters. Preserve legacy permissions and historical IDs. Next add current-status/session/capability/DTO gates, Admin-reviewed pending linking, and own-return-only Staff/User UI in reviewed increments, with direct API and local browser tests before activation.

Blockers: no operational old-reader gate; no new credential/registration/review UI or actual identity-proof process; no authoritative persisted lifecycle adapter or root bridge; no general migration/recovery quarantine; relink/open-trip reconciliation and compatible downgrade must be reviewed. Policy v1.0 is approved; these are implementation/integration gaps, not a request to reopen Q1–Q10. No live work is automatically resumed.
