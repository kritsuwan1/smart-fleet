# Task 3D.4C — Offline role/onboarding compatibility spike

## Task 3D.4D-2 / Policy v1.1 (current)

[SELF_REGISTRATION_V1_1.md](SELF_REGISTRATION_V1_1.md) supersedes the historical v1.0 pending-signup assumptions below. Owner changed Q6 only: immediate self-account User access without Admin approval; Q7 verified Person linkage and Q1–Q5/Q8–Q10 remain.

Operational readers now accept exactly self-user version3 records with role User, driverId=null, status ACTIVE/DISABLED/REJECTED and raw legacy active=false. State marker3 distinguishes the mixed snapshot. The legacy deny fuse prevents pre-gate user→Employee login; effective status controls the new self account. No Person association, operation/history/report/Fleet access or new-User privileged-role upgrade is admitted. DTO has only own User/actor/scope/personLinked=false. Own password/reset/revocation protections retained; no queue or automatic Employee conversion.

Backups remain schema1 for legacy; version3 requires schema2 JSON with integrity checks. Shared source/target SQL guards and automatic restore support the exact mixed format; invalid/downgraded artifacts refuse. Legacy credential fields/IDs/history/Maintenance/ledger are preserved. Old3D.4D-1 rejects marker3; old writers must not share these snapshots. No deployed binary/old SQL file is retroactively fixed; no lossy downgrade or real migration authorized.

Windows Node24.22.1 ci/build/typecheck27 suites PASS:60 self-registration/170 strict guard/102 historical spike/45 transaction/163 value-validation cases. Edge157.0.4341.42 local360px actual signup/login/signed-cookie/logout/password change/restricted API PASS; physical mobile/TLS/cloud NOT_VERIFIED. Exact implementation 824a4214fbb019fa1ff30e12d7a406945be08fdc verified by Linux CI [42761789176](https://github.com/kritsuwan1/smart-fleet/actions/runs/42761789176), job129648950771, completed/success on2026-11-10 12:23 Asia/Bangkok: Ubuntu24.04.5/Nodev24.22.2, npm ci/build/typecheck/all27 suites PASS including60 self-registration/170 guard/102 historical compatibility/45 transaction/163 validation cases. Exact head_sha and decoded logs checked; Linux bundle sizes Demo1018655/Production1017281/Staging1017428 bytes, install reported0 vulnerabilities. This docs-only evidence follow-up leaves the tested executable inputs unchanged. Staff and Admin-verified linking/new-User role changes remain disabled; next proposed3D.4D-3 exact-Person verification and scoped activation. Operator/Live/Initialize/Deployment DEFERRED.

## Historical 3D.4D-1 / v1.0 reader contract

## Task 3D.4D-1 — actual Development runtime gates (current)

2026-11-05, approved Policy v1.0. **Guard implementation verified offline; Staff/User/lifecycle activation NOT_ENABLED. Operator/Live/Initialize/Deployment DEFERRED.** The 3D.4C sections below are historical spike evidence, superseded here only for the implemented reader boundaries.

### Accepted representation and future record boundary

[src/account-compatibility.ts](../src/account-compatibility.ts) is the shared strict reader policy. Valid legacy Fleet has core cars/people/trips/audit/projects arrays, imported boolean, optional accounts, and optional nonempty string sessionKey. Missing sessionKey is the recognized old-state lazy-key migration; null/empty/non-string keys are ambiguous and refused, not repaired. No existing valid record is normalized or converted.

Legacy accounts accept only role admin, employee or an absent role explicitly adapted to employee. They require nonempty id/username/name/salt/passwordHash/driverId, boolean active, nonnegative safe-integer passwordVersion, an existing Person link and unique account IDs/usernames. Stored root-id/username admin is ambiguous (the existing root lives outside accounts), so fail closed for review. No password derivation, minimum length, root secret, signing claims or session expiry policy changed. The guard checks credential field shape, not provenance or password-hash algorithm migration. Invalid/unknown credentials never trigger repair or account conversion.

The absent account-format marker denotes existing legacy version1; explicit top-level accountFormatVersion=1 also requires exactly those legacy security semantics. No marker is added by reads/writes. Unsupported versions, wrappers, authorization/security/policy markers and inline lifecycle fields are refused. Unknown non-security legacy fields remain intact. Legacy active=false is supported and still denies that account; it does not block other valid legacy users.

Future **metadata-only** shape is separately named FutureAccountMetadata:
~~~text
{accountFormatVersion:2, role:admin|staff|user|legacy-employee,
 status:PENDING|APPROVED|REJECTED|DISABLED,
 personId:string|null, accessRevision:nonnegative safe integer}
~~~
APPROVED requires a Person ID; null permits an unlinked PENDING review design. inspectFutureAccountMetadata can validate/clone this exact metadata shape for local tests. It supplies no credential record, persistence, permission, approval proof or session. Operational readers reject every such version2 record, including APPROVED, and the entire incompatible Fleet. They never guess Employee from unknown roles or active=true. This is a safe exclusion gate, not partial activation of the new model.

### Actual runtime integration

| Boundary | Enforcement / preserved behavior |
| --- | --- |
| storage.readState | Read/parse/guard existing main before lazy initialization/key writes. Existing keyed state is read-only. Recognized missing-key state is rechecked and updated with expected version; re-read/guard after CAS, fail if a concurrent update prevents obtaining a valid key. Never mutate unsupported stored snapshots. Safe parser exposes only ACCOUNT_FORMAT_UNSUPPORTED, no malformed JSON fragments. |
| storage.writeState / writeTripOperation | Guard candidate before any write, read/guard stored main and check version before existing CAS. Stored/candidate mismatch refuses; same version-CAS/atomic3-statement operation batch remains authoritative. No data rewrite/migration or sequential fallback. |
| auth.checkLogin/currentUser/sessionUser/issueSession/viewForUser | Guard even before root shortcut/credential comparison. Explicit legacyAccountRole, no non-admin fallback. Session issuance rechecks current account/passwordVersion; bad snapshots cannot mint/use sessions or serialize Fleet/members. Disabled legacy account remains denied; normal legacy Admin/Employee scope/login unchanged. |
| Fleet API | Existing auth/ownership/validation/action guards retained; compatibility failures return sanitized503 ACCOUNT_FORMAT_UNSUPPORTED, no Fleet/result. No new HTTP routes or actions. |
| Worker dispatch | Existing readState guard covers login/registration/assets/API/backup entry paths. Incompatible state fails503 before rate-limit/registration writes. Normal legacy signup still creates Employee exactly as before; no pending/staff/user signup or review UI is activated. |
| createBackup / inspectBackup | Guard account/version shape before export/inspection acceptance. New/legacy envelope support and SHA256 checks unchanged for valid data; incompatible source or correctly rehashed bad account data refuses. |
| automatic artifacts / isolated restore | Existing paths reuse createBackup/inspectBackup, so refusal precedes restore mutation. Existing target/environment/empty-only guards/session-key rotation preserved; no automatic-backup/Cron/R2 behavior activated. |
| SQL backup | Export parses/guards the exact row read. Generated trusted SQL adds the same account policy as a target preflight after CREATE IF NOT EXISTS and before scratch-row creation or main replacement. On an existing incompatible target, schema/rows/versions/ledger stay unchanged. Empty-target table creation and valid legacy target restore remain supported. |
| offline SQL rehearsal | Accepts the exact generated new SELECT guard, not a permissive SQL prefix; existing restricted SQL statement checks remain. No cloud connection/real DB is introduced. |

JS and generated SQL share reserved-field lists and are tested for positive/negative parity, including optional legacy data, numeric versions and null/unknown/security/root collisions. Refusal of malformed JSON or SQL JSON types is safe denial, not schema repair. SQL uses only fixed internal payload expressions, never user-selected identifiers or request SQL.

### Backup, old-reader and rollback limits

Full backup format remains schemaVersion1 for valid legacy Fleet; no new credential storage format is enabled. The sidecar v2 spike envelope remains quarantined and cannot be installed in operational main. Backup bytes/metadata checksums still detect integrity, not trusted origin or identity proof. Existing main-only backup exclusion of the operation ledger and session-epoch reset on restore remain explicit limitations.

New SQL exports refuse incompatible existing targets before effective mutation. A prior green test used {obsolete:true} as a populated target; it is now an explicit rejection case. The valid populated-restore fixture uses an actual legacy Fleet instead. This intentionally rejects invalid targets while preserving valid legacy restore/rotation. The original environment guards are unchanged.

**Arbitrary/manual SQL and pre-gate SQL files are not made safe by a JavaScript gate.** Only the new trusted generated export and existing isolated test/rehearsal contracts are verified. Do not execute untrusted/tampered SQL or an old restore script against new-format data. No operational SQL execution/restore is authorized here. A generic untrusted-SQL importer is not added.

Current Development readers now fail closed; **old deployed binaries are unchanged**. Tests preserve the pre-gate role-coercion behavior as an explicitly labeled small historical model, demonstrate that old behavior is unsafe for future data, and verify refusal in the actual new modules/Worker. They do not certify an old deployed binary. Older-reader exclusion in a mixed-version rollout still requires a separately approved storage/access/runtime cutover. Since this task writes no future states, no such migration is needed now.

Rollback compatibility is tested for unchanged recognized legacy data, preserved original IDs/accounts/history/ledger and operation replay. A previous binary may still read that unchanged legacy layout, but loses these new security gates. Never downgrade over future status/version data; the 3D.4C exact-candidate/no-loss rollback rules remain in force. No schema/data migration, root credential change, account conversion, ledger pruning or actual rollback occurs.

### Tests and current evidence

New tests/operational-compatibility.test.mjs:164 synthetic cases in npm test (26 suites). Covers JS/SQL compatibility parity; future metadata/status cross-product; zero-write refusal before missing-key initialization, login/rate-limit/register/API; direct session/root/Fleet/member/export denial; valid absent-role/disabled legacy compatibility; candidate and stored-state write refusal/CAS races; malformed-payload redaction; correctly rehashed bad account backups; complete schema/row/version/ledger snapshots on SQL/automatic-restore refusal; valid restore/session rotation; actual concurrent same-ID return/lost acknowledgement/replay/conflict/recovery with one audit/odometer commit. External-fetch tripwire zero.

Existing102 compatibility cases retain their invariants; only the old “current auth accepts unsupported data” probe now expects actual refusal and labels the earlier coercion as historical. Existing backup-alerts valid populated target is corrected as above; its invalid-target case is explicitly covered by the new suite. Prior45 transaction/163 value-validation/account/role/Maintenance/security suites retained, not weakened.

Windows x64 Node24.22.1 npm ci PASS (42 installed/audited43, reported0 vulnerabilities; existing install-script restrictions unchanged), build PASS (Demo1014923/Production1013549/Staging1013696 bytes), typecheck PASS, all26 suites PASS. No lint script. Exact implementation cdd610e1683747e18718c4ba2dc5bb4ea2cac856 verified by Linux CI [41966113822](https://github.com/kritsuwan1/smart-fleet/actions/runs/41966113822), job127043386817, completed/success on2026-11-05 11:10 Asia/Bangkok: Ubuntu24.04.5/Node24.22.1, npm ci/build/typecheck/all26 suites PASS, including164 operational guard/102 compatibility/45 transaction/163 value-validation cases. Exact head_sha and decoded logs checked; Linux bundle sizes Demo1013875/Production1012501/Staging1012648 bytes, reported0 vulnerabilities at install. This docs-only follow-up leaves the tested executable tree unchanged. No new browser/physical-device/cloud/credential/real DB claim.

### Proposed Task 3D.4D-2 (separate scoped authorization)

Review/define the authoritative persisted account/credential/lifecycle model and root adapter, versioned backup/restore admission and denial-preserving mixed-reader cutover with synthetic fixtures first. Then integrate current-status/capability/DTO projection under approved v1.0 in reviewed increments; preserve Employee behavior and immutable historical ownership. Do not enable signup/role assignment/review UI until that representation and session/transaction reconciliation are validated.

Remaining limits: future metadata is not a complete credential record; no new state reader, approval workflow, identity-proof mechanism, status UI, generic migration or mixed-version deployment mechanism. Ambiguous credential/root/format records fail closed for review rather than guessed conversion. New features remain NOT_ENABLED, full new-policy route/UI acceptance NOT_RUN; Operator/Live/Initialize/Deployment remain DEFERRED.

---

## Historical Task 3D.4C spike record

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
- Exact implementation fef56f8865ba2a8b3e280271a2d06f02f57f9301 verified by Linux CI [41963063663](https://github.com/kritsuwan1/smart-fleet/actions/runs/41963063663), job127033697190, completed/success on2026-11-05 10:40 Asia/Bangkok: Ubuntu24.04.5/Node24.22.1, npm ci/build/typecheck/all25 suites PASS, including102 compatibility/45 transaction/163 validation cases. Exact head_sha and decoded job logs checked; Linux bundle sizes Demo1007946/Production1006572/Staging1006719 bytes, reported0 vulnerabilities at install. This documentation-only evidence follow-up does not change tested executable inputs. New policy route/UI/full migration acceptance remains NOT_IMPLEMENTED/NOT_RUN, not satisfied by25 offline suites.
- No new browser/UAT/identity-proof/operator/authenticated cloud/TLS/resource claim. No operational role activation, pending signup, actual account conversion or deployment.

## Proposed Task 3D.4D and remaining blockers

Separately authorize a bounded Development implementation: first enforce version/unknown-security refusal at all real storage/auth/backup boundaries with synthetic tests and no new role activation; then choose/review the authoritative versioned account/credential layout and matched read/write adapters. Preserve legacy permissions and historical IDs. Next add current-status/session/capability/DTO gates, Admin-reviewed pending linking, and own-return-only Staff/User UI in reviewed increments, with direct API and local browser tests before activation.

Blockers: no operational old-reader gate; no new credential/registration/review UI or actual identity-proof process; no authoritative persisted lifecycle adapter or root bridge; no general migration/recovery quarantine; relink/open-trip reconciliation and compatible downgrade must be reviewed. Policy v1.0 is approved; these are implementation/integration gaps, not a request to reopen Q1–Q10. No live work is automatically resumed.
