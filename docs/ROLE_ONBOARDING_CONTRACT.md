# Role & onboarding contract — Policy v1.1

## Policy v1.1 — owner change recorded 2026-11-10 (current)

**v1.1 supersedes v1.0 Q6 only:** new self-registration creates an immediately active **User personal account**, without Admin approval or a PENDING queue. Q1–Q5 and Q7–Q10 remain unchanged. Immediate account access does not prove Person/employee identity; checkout/return/Person-linked history remain unavailable without Admin-verified exact Person linkage.

Current implementation is [SELF_REGISTRATION_V1_1.md](SELF_REGISTRATION_V1_1.md): credentials/session protections preserved, no Person matching/creation on signup, exact self-only DTO, no vehicle/Fleet/report/backup/admin access. New User remains unlinked in this build; linking and privileged role assignment are not activated. Existing Employee/Admin accounts and historical data remain unchanged. Staff/Admin cannot be selected by public signup; existing authorized legacy role management remains Admin-only.

Recognized self-user v3 status ACTIVE governs personal-account login; legacy active=false is retained as an old-auth deny fuse, not a current disabled account. DISABLED/REJECTED deny login/session; unknown role/status/version still fails closed. New User is not automatically Employee. New snapshots use versioned guards/schema2 JSON backups; no lossy downgrade or mixed old writer is supported.

The v1.0 records and pending-only spike below are **historical**, not current signup requirements. No operational PENDING queue is introduced. Operator/Live/Initialize/Deployment remain DEFERRED. See the linked guide for tests, browser scope and rollback limitations.


## Historical v1.0 / 3D.4D-1 contract record

Date: 2026-11-05 (Asia/Bangkok). Repository: kritsuwan1/smart-fleet. Branch: dev/smartfleet-batch-1.

**POLICY v1.0 APPROVED FOR OFFLINE DEVELOPMENT — OPERATIONAL ACTIVATION NOT APPROVED / NOT ENABLED.** No existing Employee conversion or actual account/auth change. Operator/Live/Initialize/Deployment remain DEFERRED; actual operational verification remains NOT_VERIFIED.

**3D.4D-1 current implementation:** Development now has strict operational legacy/version/role/status exclusion guards, tested offline. This supersedes historical unknown-role coercion claims for the new source only. Legacy signup/permissions remain unchanged; Staff/User/lifecycle activation NOT_ENABLED. Future metadata has no credential/root adapter or approval workflow. Details: [ROLE_ONBOARDING_COMPATIBILITY.md](ROLE_ONBOARDING_COMPATIBILITY.md). No old deployed binary, real account or cloud behavior is changed.

## Policy v1.0 — owner approval recorded 2026-11-05

The owner approved Q1–Q10 in the Task 3D.4C instruction. This supersedes the original draft choices below; it does not approve operational activation, account conversion, cloud access or deployment.

| Decision | Approved v1.0 |
| --- | --- |
| Q1 | Staff checkout/return own trips only; all-history visibility does not grant another user's return. |
| Q2 | Staff/User may return own open trips; cannot amend existing trip details. Legacy Employee retains its current narrow open-trip editing behavior. |
| Q3 | Staff may read all trip history and aggregate reports with minimized personal data. The precise offline DTO is in ROLE_ONBOARDING_COMPATIBILITY.md; no name/destination/note/account directory is needed for it. |
| Q4 | User may read own history and personal reports; retain minimal operational car/availability/odometer data needed for checkout/return. |
| Q5 | Staff manages Maintenance (existing plan/complete/history-correction scope); User reads basic reminders only, without history/details/costs. |
| Q6 | Self-registration creates PENDING; explicit Admin approval mandatory before operational access. |
| Q7 | Admin verifies identity and links exact Person ID; never automatic name-only claim. |
| Q8 | Existing Employee permissions/IDs/history preserved; no automatic conversion. |
| Q9 | New account/status format versioned; unsupported old readers must be denied. |
| Q10 | Offline/Mock development only. Deployment requires separate explicit owner approval. |

Approved role/action summary (all operational access requires APPROVED; no automatic root/account migration):

| Capability | Admin | Staff | User | Legacy Employee |
| --- | --- | --- | --- | --- |
| Checkout / own open return | Full validated Admin scope | Own only | Own only | Existing own-only scope |
| Amend existing trip / closed history | Existing Admin scope | Denied | Denied | Existing narrow own-open edits, closed denied |
| History / reports | All | Minimized all-history + aggregates + own reports | Own history + personal reports | Existing own history/reports unchanged |
| Maintenance | Manage | Manage | Basic reminders | Existing active-plan reminders unchanged |
| Account approval / identity linking / roles | Admin only | Denied | Denied | Denied |
| Full backup / import / car & directory management | Existing Admin-only scope | Denied | Denied | Denied |
| Restore / cloud / deployment | Separate existing operational approvals; no new HTTP restore | Denied | Denied | Denied |

**Implementation details still open, not reversals of approved policy:** production-ready version gate/storage layout and old-binary exclusion; registration identity/credential records; review evidence process/retention and UI; pending status/password recovery; root bootstrap adapter; status/relink handling with active/uncertain trips; restore quarantine and capacity/ledger retention. The spike models these only where safe with synthetic fixtures. Rejected-account reopening and driver relinking have no new implementation or implied authorization. See [ROLE_ONBOARDING_COMPATIBILITY.md](ROLE_ONBOARDING_COMPATIBILITY.md).

The remainder is the pinned 3D.4A audit/design history. Its original Q choices / NOT_APPROVED statements describe that earlier draft, **not the current v1.0 owner decision**. Current application auth/signup is still unchanged; new roles and pending signup are NOT_ENABLED. Contract approval does not mean full implementation or new policy acceptance/UAT PASS.


## 1. Historical 3D.4A evidence and prerequisite gate

- Verified implementation [f51efec80a20fbcc6c2a6d97cb9436b9d5e09554](https://github.com/kritsuwan1/smart-fleet/commit/f51efec80a20fbcc6c2a6d97cb9436b9d5e09554): expected 15 paths, parent a57bf7d; atomic keyed trips, client reliability, tests/package script and docs.
- Verified [6edfcb7fb93f865ea5d0bdc3bd109dcbe4eabf9e](https://github.com/kritsuwan1/smart-fleet/commit/6edfcb7fb93f865ea5d0bdc3bd109dcbe4eabf9e): parent f51efec, exactly three documentation paths (PROGRESS, TEST_PLAN, TRANSACTION_RELIABILITY); Development HEAD before this task.
- Re-fetched exact [Linux CI 41953314810](https://github.com/kritsuwan1/smart-fleet/actions/runs/41953314810) and decoded job127002142499 logs: completed/success, head_sha=f51efec..., dev branch, Ubuntu24.04.5 / Node24.22.1, ci/build/typecheck and all24 suites, including transaction45 / validation163. Prerequisite PASS; no prior-run substitution.
- Read AGENTS, ARCHITECTURE, PROGRESS, ROADMAP and TEST_PLAN. Compared Git blob hashes for 94 source/script/test/package/build inputs with the exact remote tree: all identical. Source audit below is pinned to 6edfcb7 (same executable tree as f51efec), not deployed behavior.
- This task reran unchanged Windows x64 Node24.22.1 build/typecheck/existing24 offline suites: PASS. No new role/state tests were implemented. New docs-only CI is NOT_RUN under existing workflow paths-ignore, not inferred to have passed.
- No actual cloud, credential, real DB, Production/Demo or Operator access. Existing tests instantiate synthetic credentials/data in memory only.

## 2. Actual implementation today — keep separate from the proposal

| Boundary / source | Observed behavior |
| --- | --- |
| [fleet.ts](../src/fleet.ts), [auth.ts](../src/auth.ts) User/Account/userFromAccount | Only admin/employee; absent/non-admin roles resolve to employee. Account has active, driverId, passwordVersion, no approval lifecycle. Do not store staff/user/status in the old runtime and assume enforcement. |
| auth.ts registerEmployee; [worker.ts](../src/worker.ts) POST /register | Public rate-limited self-signup creates active employee, links Person by normalized matching name or creates Person, audits registration, immediately issues operational session. Request role cannot promote caller. Existing duplicate-name/username/driver checks are not identity proof. |
| auth.ts checkLogin/sessionUser/currentUser | Root admin is outside accounts, authenticated by existing runtime secret; account users require active and matching passwordVersion. Eight-hour signed secure HttpOnly SameSite cookie. Account edits/disable/enable/reset increment passwordVersion; own password change clears cookie. Logout clears browser cookie; no per-session server revocation list. |
| auth.ts viewForUser | Admin sees all Fleet trips/people/audit and sanitized members/systemStatus; no raw accounts/sessionKey. Employee sees only trips with ownerUserId equal account ID, only linked Person, all cars with currentOdo, projects/fuel data and occupied car IDs. Active plans on active cars are visible; maintenanceHistory is removed, audit empty, members empty. Car/occupancy/project data are shared operational metadata, not solely personal data. |
| [api.ts](../src/api.ts) fleetApi | Rechecks current user/version. Only trip action allowed for Employee; all other actions Admin-only. Employee driver forced server-side; other-owner/closed-trip edits denied; existing departure car/start/odo cannot change. Own open-trip edits otherwise remain allowed today. Admin edits/history/imports are broader. |
| api.ts trip ownership | New non-root transactions, including named Admin transactions, get actor ownerUserId; root-created trips may have no owner. Existing owner persists when edited. Employee read/return access is ownerUserId-based, never inferred merely from driverId. |
| api.ts account/person actions | Admin edits role only admin/employee, increments session version; self-demotion/disable denied. Linked Person name edits update account display name. Person.active is not account.active: disabling Person alone is not session revocation; it blocks new trip validation but an existing trip may still be returned. |
| [App.tsx](../src/App.tsx), [AccountPanels.tsx](../src/AccountPanels.tsx) | Boolean isAdmin controls settings and edit capabilities. Employee still has own Dashboard, reports/monthly PDF/Excel and read-only Maintenance reminders. Simply adding Staff and showing all trips would also expose non-owned return/edit buttons; visibility and write capability must be separated. |
| [import-plan.ts](../src/import-plan.ts) | Admin Excel imports may match/create Person by normalized name; imported new trips have no account owner. Updates preserve old ownerUserId even if imported driver changes. Import establishes historical driver attribution, not authenticated identity or ownership. |
| [backup.ts](../src/backup.ts), worker.ts backup, [automatic-backup.ts](../src/automatic-backup.ts) | Full Fleet backups include private account hashes/salts/session material; not appropriate Staff/User reports. Current JSON account inspection only checks basic references/string fields, not a future role/status contract. SQL/main restore rotates session key; automatic restore is a local library, no HTTP restore route, empty isolated staging target only. No UI restore privilege is created by Admin access. |
| [trip-operation.ts](../src/trip-operation.ts), [storage.ts](../src/storage.ts) | Key namespace actor/session epoch/operation ID; record binds role, driver, car and payload. Replay reauthorizes current identity/role/driver/ownership, returns original receipt plus fresh scoped state. Atomic ledger+main CAS, legacy unkeyed CAS-only. Role/driver changes intentionally prevent replay of an old-scope result. Ledger is not in main-only backups. |

Evidence of covered behavior: existing accounts, roles, worker, profile-ui, reports, maintenance, backup-alerts, automatic-backup, import, staging and transaction-reliability suites. Variable names such as “staff” inside old tests are employee/admin fixtures, not evidence of an implemented Staff role.

## 3. Explicit action matrix

All proposed columns apply ONLY to APPROVED accounts under an owner-approved future policy. PENDING/REJECTED/DISABLED override role and deny operational access. A = allow within stated scope; D = deny; Q = unresolved owner decision, recommended deny until approved. “Legacy” means current Employee semantics preserved during design; future mapping/cutover is not approved.

| Action | Current Admin | Current Employee | Proposed Admin | Proposed Staff | Proposed User | Legacy Employee until approved mapping |
| --- | --- | --- | --- | --- | --- | --- |
| Self profile / own password | A; root password via existing external administration | A | A; root exception retained | A | A | Existing A |
| Vehicle checkout as self with verified driver | A; root can select driver | A | A | A | A | Existing A |
| Return own open trip | A | A | A | A | A | Existing A |
| Return another person's trip / on behalf of driver | A | D | A, audited | Q1: recommend D | D | Existing D |
| Amend own open trip beyond normal return | A | A under current immutable-departure restrictions | A | Q2: preserve existing narrow behavior or return-only | Q2: same decision | Existing narrow A |
| Edit closed trips / add historical trips | A | D | A, audited | D | D | Existing D |
| Read own trip history/details | A | A by ownerUserId | A | A | A by ownerUserId | Existing A by ownerUserId |
| Read all trip history/details | A | D | A | A, fields need Q3 approval | D | Existing D |
| Operational vehicle-selection home | A | A | A | A | A, minimal occupancy/odo/car fields | Existing A |
| Fleet-wide Dashboard | A | D (personal home only) | A | A, Q3 fields | D | Existing D |
| Personal reports / PDF / Excel | A | A from own scoped state | A | A | Q4: recommend D under “history only” proposal | Existing A until approved mapping |
| Aggregate team reports | A | D | A | A; Q3 export/dimensions | D | Existing D |
| Raw all-trip export / named driver reports | A | D | A | Q3, recommend D until explicit approval | D | Existing D |
| Read Maintenance reminders/plans | A | A, active filtered | A | A, Q5 fields | Q5: proposed D except owner-approved safety summary | Existing filtered A |
| Write Maintenance plans/history/corrections/cost | A | D | A | Q5, recommend D until explicitly approved | D | Existing D |
| Manage cars / people / projects / fuel-price override | A | D | A | D | D | Existing D |
| Approve/reject/disable/link users; assign roles/reset passwords | A (no approval lifecycle yet) | D | A, self/root/last-admin guards | D | D | Existing D |
| Import historical Excel / seed imports | A | D | A; never grant identity from file names | D | D | Existing D |
| Full SQL/JSON backup download / backup-status | A | D | A, sensitive/private | D | D | Existing D |
| HTTP restore operation | No route | No route | No route added; separate recovery approval | D | D | No route |
| Audit feed / system status / QR management | A | D | A | D; Q3 sanitized metrics separate | D | Existing D |

Owner's proposed “Admin full management” describes application capabilities, not authorization to run cloud recovery/deploy or access credentials. Admin-owned writes still obey validation, environment, storage limits, CAS and transaction idempotency. No trip delete endpoint exists today; this contract does not introduce one.

## 4. Data-scope contract — enforced before serialization

| Data | Admin | Staff proposal | User proposal | Legacy Employee |
| --- | --- | --- | --- | --- |
| Account directory | Sanitized lifecycle/role/link/admin-review metadata, no hashes/salts/sessionKey | Self public profile only | Self public profile only | Existing self User and empty members |
| Trips / receipts | All; changes audited | All history, read-only except own permitted operations; exact PII fields Q3 | Own by immutable ownerUserId; never by chosen driver/name | Current owner filter unchanged |
| People / identities | Directory needed for approved admin work | Minimum driver display required for approved all-history, no account credentials/contact/review evidence | Own linked Person only | Own linked Person only |
| Cars / currentOdo / availability | All management fields | Operational set; no other-driver identity through occupancy unless Q3 | Active selection metadata plus own open-trip car even if inactive; occupancy boolean/IDs, not someone else's destination | Existing cars/currentOdo/occupiedCars behavior |
| Projects / fuel prices | Full application scope | Only approved reporting/selection fields | Only checkout project choices; no global project totals, fuel pricing/report data unless Q4 | Existing project/fuel metadata retained pending mapping |
| Maintenance | Full plans/history/cost | Q5: reminders read; history/cost/write undecided | Q5: no maintenance dataset under strict history-only policy | Active plan reminders; no history/cost records |
| Audit / system metrics | Redacted admin view | No raw audit/account capacity/backup metadata; optional aggregate metrics require explicit scope | None | audit empty, no systemStatus |
| Full backups / operation ledger | Sensitive recovery/admin tooling only | None | None | None |

Reports currently compute in the browser from GET /api/fleet; they are not separately authorized server report endpoints. Removing a report tab alone does not withhold data already in JSON. Future aggregate responses must exclude raw fields not approved for Staff; choose server-computed aggregates or a deliberately approved minimal DTO, not entire Admin Fleet. All-history permission does not grant account directory, backup, raw audit or write permissions.

## 5. Proposed account lifecycle

Suggested future status field: PENDING / APPROVED / REJECTED / DISABLED, independent of assigned role and verified driver link. This is a data-shape/business-policy proposal requiring approval; no fields are added now. Avoid contradictory active/status combinations: define a versioned adapter and a single effective-access predicate before any write migration. Role, status and identity linkage must be evaluated together.

| Transition | Authorized initiator / guard | Result and session rule |
| --- | --- | --- |
| Signup → PENDING | Public same-origin/rate-limited validated signup; ignore requested role/status/driverId | No Person claim/create solely from submitted name, no operational session, no dashboard redirect; show minimal application receipt |
| PENDING → APPROVED | Authenticated currently approved Admin, explicit identity check and unclaimed active Person selection or reviewed new Person | Default User; atomic role/status/link/audit/CAS; require fresh login |
| PENDING → REJECTED | Approved Admin with redacted reason | No operational access; retain record for controlled review; no automatic delete |
| APPROVED → DISABLED | Approved Admin; self/last usable Admin/root restrictions | Immediate effective denial, increment existing passwordVersion/access revision; revoke cached views |
| DISABLED → APPROVED | Admin rechecks identity/link and prior approval | New login required; old cookie must not revive; default no role escalation |
| REJECTED → PENDING | Q6: recommend explicit Admin reopen only | New review; never direct auto-approval or public resubmission bypass |
| Role/driver reassignment while APPROVED | Admin-controlled, Q7 relink rules | Audited CAS, fresh login; pending operation reconciliation first, no historical rewrite |
| Any operational state change | Concurrent action guard | Recheck current principal/target snapshot immediately before CAS; conflict makes no partial mutation |

PENDING/REJECTED/DISABLED must not receive /api/fleet, operational assets, reports, backup/status, fuel-price or write access even if they carry a previously issued cookie or claim role=admin. Proposed response convention: anonymous/stale/invalid cookie 401; authenticated but unapproved identity 403 with minimal ACCOUNT_NOT_APPROVED/ACCOUNT_DISABLED status (no Fleet); unknown capability 403. Status-only login/session is Q6: recommend no operational cookie and a separate minimal status experience if required. Public login/registration responses must not reveal another person's review status or directory.

PENDING accounts may have no driver link, whereas current backup validator requires every account.driverId in people. Therefore status support cannot be safely implemented by setting active=false alone. Admission, session resolution, view serialization, backup validation and older-reader refusal must be released as one tested contract. Existing Admin active-toggle must not approve a pending/rejected account accidentally.

## 6. Identity linkage and historical compatibility

1. Registration accepts a display name as unverified application data. Names are for search/display only; never proof or an ownership predicate. Do not auto-link existing Person or grant history on name equality, username, imported driver label or client-supplied driverId.
2. Future Admin review uses an owner-approved offline/business identity check (e.g. supervised confirmation against an internal roster). Retain reviewer account ID/time/result and an opaque internal reference, not identity-document scans or secrets in Fleet/audit. No external identity integration is assumed.
3. Admin selects exact Person.id or explicitly creates a new Person after review. Re-read latest accounts/people and enforce one approved account per driver, unless owner expressly approves a different model. Concurrent claims must yield one success/one conflict with no partial link or Person creation. Duplicate names may need display disambiguation, never an automatic merge.
4. Q7: recommend refuse relink while an open trip or uncertain keyed operation exists; resolve using existing authorized Admin review first. Keep account IDs stable. A Person inactive flag alone must not silently disable an account; new effective-access policy must state how inactive links block checkout while permitting Admin resolution of an open trip.
5. Preserve every historical trip id/seq/carId/driverId/ownerUserId and receipt. Linking an account to Person does NOT backfill ownership. Trip owner is the authenticated author/owner, driver is attribution; they need not be the same identity (Admin/imported history).
6. Missing ownerUserId (root/import/legacy) stays unowned for User/Employee access. Example: new account linked to p1 must not receive an old p1 trip with no owner. Staff/Admin may read under approved all-history scope. Old open unowned trip requires an explicit Admin close/reconciliation policy, not name-based takeover.
7. Existing owner account X with driver p1 remains owned by X after account display-name change, role change or future driver relink; no grant to a new account linked to p1. Missing/deleted owner references remain preserved and flagged to Admin; never attach them to a new same-name account.
8. Import currently preserves owner when it changes driver attribution. Future review must flag owner/driver disagreement without silently changing either. Staff cannot use import as an identity/role bypass.
9. Legacy role absent is currently employee. Keep an explicit legacy cohort/report in a synthetic dry run; Employee→User is NOT automatically compatible: it would remove personal reports and Maintenance reminders. Mapping to Staff would expand access. Existing Admin/root coverage and every Employee decision need approval before a cutover.
10. Future unknown roles/statuses or unsupported authorization format must fail closed, not use today's “non-admin means employee” coercion. Do not deploy new states into an old binary that ignores them. Transitional legacy compatibility must be explicit, bounded and approved; it must not accidentally treat every status-missing new account as approved.

## 7. Route and enforcement plan (future implementation only)

| Existing entry point | Required future enforcement |
| --- | --- |
| GET/POST /register, POST /login | PENDING-only enrollment; no supplied role/status/link override; rate limits/same-origin/body limits retained; safe returnTo cannot bypass approval |
| GET /, protected app JS/CSS/images/report-fonts | Approved-access gate before app/data delivery; pending status page carries no operational prefetch. Existing public QR SVGs carry no authority; do not change routes/assets in this design task. |
| GET /api/fleet | Current effective status/role and field-level DTO projection on every request, not just login; exact User/Staff/Admin/legacy scopes |
| POST /api/fleet trip | Shared checkout/own-return capability + ownership/driver/immutable departure/value validation + current status + existing keyed atomic write/CAS |
| POST /api/fleet maintenance | Q5 explicit read/write/history/cost capability; never derive write privilege from all-history visibility |
| POST /api/fleet account/car/person/project/fuelPrice/import/importExcel | Explicit capabilities, no blanket non-User write permission; Admin-only by draft; new account review transitions must be dedicated validated actions |
| POST /api/profile/password | Own account only, valid current status/session under chosen status-login policy; retain old-password verification, rate limit, session invalidation/root exception |
| GET /api/backup.sql, /api/backup.json, /api/backup-status, /api/system-status; /qr | Admin-only + current status; retain environment/no-R2/no-Cron/Staging QR guards |
| GET /api/fuel-price | Approved reporting capability only under Q4; do not leak/report-fetch for unapproved/User clients |
| POST /logout; GET /password-changed | Logout must stay reachable to clear restricted sessions; public password-changed page contains no Fleet |
| Recovery library / scripts | No new web endpoint, no Staff/User privilege, no live execution; retain isolated target/schema/environment/approval guards |

Method/body/origin/environment checks remain in force; deny unlisted methods/actions. Authorization must be centralized enough that Worker routes, API actions, exports, refresh/replay and UI use the same policy; do not introduce distributed signatures/brokers for ordinary application roles. Server gates remain authoritative even if a caller bypasses navigation/buttons.

## 8. Backup, audit, multi-car and idempotency impact

- **Backup/restore:** future contract must validate roles/status/link shape, preserve legacy valid data and unknown non-security fields, and fail before mutation on invalid security metadata. Current checker is not sufficient approval validation. Choose versioned envelope/state handling and downgrade refusal; SQL exports are raw trusted application snapshots, not protected by a JS validator on arbitrary execution. Full backups remain sensitive Admin-only, never Staff aggregate exports.
- **Recovery authorization:** restoring an older snapshot may revive old roles/active approvals. A future recovery rehearsal must quarantine operational login until owner-approved identity/status reconciliation; rotate sessions, preserve history, verify all account/link/counts and never infer APPROVED from missing fields. No recovery change or execution is authorized here.
- **Audit:** current Audit uses actor display-name string, which is not a stable reviewer identity. Proposed additive security events should carry stable reviewer/subject IDs, before/after role/status/link, reason code, server time and request correlation; redact hashes/salts/session/cookie/password and avoid embedding verification documents. Record decisions atomically; denied-request logging must be rate-limited/redacted and not create business writes or leak existence. Security-event shape/capacity needs approval.
- **Multi-car:** role scope is organization-wide in the proposal, not a per-car ACL. Keep car isolation, availability, odometer, no-overlap, own-return and disabled-car-with-open-trip rules. Vehicle filters are not permission checks. If assignments/per-car access are needed, that is a separate owner decision.
- **Idempotency:** retain same actor/epoch/ID/payload and atomic ledger+Fleet CAS. Never bypass current approval/status because a result exists; unknown/disabled/rejected cannot replay. Role/driver changes already invalidate old-scope replay; future tests must reconcile original commit without granting a broader view or sending a new operation ID blindly. Do not relabel stored actorRole, ledger fingerprints or historical receipts.
- Freeze/drain uncertain operations before any mapping/relink/access cutover; named Admin versus root ownership remains unchanged. Return another user's trip needs its own explicit permission and audited workflow, not changing ownerUserId. No weaker retry path for Staff.
- PasswordVersion can be reused as the current session-invalidating mechanism if the approved design increments it on all access changes; no separate session subsystem is automatically required. Main CAS catches concurrent decision/write conflicts; stale/demotion/rejection races must be exercised. Main-only restore excludes operation ledger and changes epoch: existing cross-restore limitations remain.
- Current page pending operation ID remains memory-only; this contract does not claim cross-reload recovery or solve ledger retention. No pruning/deletion is proposed.

## 9. Planned direct API and UI acceptance tests — NOT IMPLEMENTED / NOT_RUN

Run a table-driven cross-product for Admin, Staff, User and explicit legacy Employee in each PENDING/APPROVED/REJECTED/DISABLED state, plus anonymous, expired/revoked cookies, unknown role/status, missing legacy fields and root exceptions. A role label never overrides status. Fixtures are synthetic with at least two users/two cars, owned/unowned/imported trips, duplicate names, old/new backups and outstanding operations.

| ID | Direct API / data assertions | UI assertions |
| --- | --- | --- |
| RC-01 | Signup-supplied admin/staff/approved/driverId/ownerUserId ignored/rejected; creates exactly one PENDING application, no Person claim/Fleet exposure; duplicate/concurrent signup safe | Registration confirmation says awaiting approval; no auto Dashboard, no QR/returnTo bypass |
| RC-02 | Every non-approved role denied all operational routes/actions, exports/status/fonts/assets and old cookie reuse; public routes/logout still safe | Pending/rejected/disabled screen has no trip/report/admin prefetch; cached operational UI cleared on denial |
| RC-03 | APPROVED User valid checkout/own return and own history; other-owner/unowned return/edit/history/receipt denied or excluded; driver spoof ignored/rejected | Minimal vehicle selector/own history/profile; other-driver names/history/reports/settings absent, no controls through direct navigation |
| RC-04 | APPROVED Staff all-history read and approved aggregates; cannot write another's trip, user/role/link/import/backup/restore/fuel/car data; Q3/Q5 branches tested after decisions | All-history read-only detail has no unauthorized return/edit button; own return works; Maintenance controls match approved read/write/cost policy |
| RC-05 | APPROVED Admin can approved management/review actions; no self/last-admin lockout, no forged root update, current CAS/auth checks enforced | Review queue exact account/Person selection, explicit decision preview and confirmation; root exception and conflict display |
| RC-06 | Name-only/duplicate/inactive/claimed/missing Person attacks; double/concurrent approval/link => one decision; actor or subject change conflict leaves entire state intact | Names visibly disambiguated by safe IDs/labels; no automatic match-as-proof; cancelled/error review does not appear approved |
| RC-07 | Lifecycle and role/link/password transitions invalidate old sessions; re-enable/reapprove never revives cookie; concurrent revocation vs write/replay safe | 401/403 while open dialog clears sensitive data and never claims saved; Admin review success only after committed result |
| RC-08 | Historical ownerUserId/driverId/trip IDs unchanged; imported/root unowned history stays excluded for User/Employee; promotion/demotion and relink cannot claim another's history | Correct personal vs all-history counts across cars, no phantom records after scope change |
| RC-09 | Every matrix row explicitly allow/deny; field-level JSON assertions prohibit account hashes/salts/session/other-user fields. Attempt action/role/ID/route/method tampering without UI | Hidden controls complement server denial; keyboard/mobile360px/direct route/export actions obey same matrix |
| RC-10 | New/legacy backup inspection, approved migration dry-run and isolated SQLite recovery preserve security states/history; tampered/unknown roles/status rejected before mutation; old-reader refusal | Private backup warning; Staff/User never offered full backup, restore or status; no false recovery PASS |
| RC-11 | All3D.3 double-submit/lost-reply/concurrent start/return guarantees; disabled/pending/changed role/link cannot replay old result; no second trip/audit/odo write; original receipt retained with fresh scoped data | Same ID on retry; status/role change while uncertain offers reconciliation, no new-ID blind retry or false receipt |
| RC-12 | Failed migrations/reviews/imports restore identical synthetic complete rows/schema/version/ledger; role/status is never inferred from person name or backup absence | Error state clear, retry does not silently broaden permission; all approved roles usable at360/390/768/1280px |

Each applicable matrix cell must have a positive authorized fixture and a negative unauthorized fixture. Verify status code, response redaction and complete business-state snapshot/version/ledger on refusal, not just button visibility. Pre-seed synthetic state to avoid confusing existing lazy-init/rate-limit operational rows with a business mutation. Current 24-suite green baseline does NOT satisfy these new role/state acceptance cases.

## 10. Phased implementation and safe rollback proposal

| Phase | Deliverable / acceptance gate | Approval boundary |
| --- | --- | --- |
| 3D.4A (this task) | Source-backed matrix/lifecycle/compatibility/test and rollback design; docs-only diff | No runtime or user change |
| 3D.4B owner decision | Resolve Q1–Q10, sign/version exact policy and legacy mappings with examples; explicit approval for necessary data/business shape | Required before feature implementation; no silent defaults treated as approval |
| 3D.4C offline compatibility spike | Synthetic migration inventory/dry-run/refusal/rollback fixtures; define supported state/backup format, nullable pending link and old-runtime refusal | Separately authorize code/tests/data-shape work on Development; no actual migration |
| 3D.4D scoped implementation | Central effective-access/DTO policy, pending signup/review/link/session gates, then role UI; transaction/security invariants retained; RC-01–12 complete | Only after contract approval; no automatic Employee conversion |
| Local acceptance | Windows/Linux Node24 build/typecheck/all regression suites, direct API cross-product and local mobile browser evidence; checksum/count/relationship snapshots and capacity tests | Exact commit CI; reviewer confirms no privilege expansion beyond contract |
| Future operational rollout | Paused enrollment/writes, reviewed cohort mapping, pending-operation drain, access-gated matched runtime/state deployment and synthetic target acceptance | STILL DEFERRED; separate Initialize/Deploy/cloud/data approvals required |

**Rollback design:** docs-only rollback is reverting this design commit; no runtime rollback is needed now. Future feature rollback must not deploy an old binary over new PENDING/Staff/User states: old coercion ignores status and can admit unapproved accounts. First deny operational ingress/enrollment using the future reviewed gate, stop new submissions, resolve/drain uncertain operations under the new runtime, retain main/ledger and post-cutover records, and produce an offline compatibility report. Prefer a forward fix or a previously tested status-aware compatible runtime. Any reverse data conversion must preserve all trips/history/IDs and rejected/pending denial, explicitly map affected accounts with owner approval, invalidate old cookies and pass synthetic snapshots first. Never restore an old full snapshot as a shortcut that erases new trips or restores revoked privileges. If a safe denial-preserving downgrade is not demonstrated, stay fail-closed and report blocked; no live rollback/migration command is authorized.

## 11. Historical 3D.4A decision queue — superseded by approved v1.0 above

| Decision | Proposed review position / why |
| --- | --- |
| Q1 Staff on-behalf checkout/return | Own only by default proposal; all-history is read permission, not authority to return others' cars. Admin resolves disabled/unowned trips. |
| Q2 Own open-trip editing | Preserve existing narrowly allowed edits or explicitly choose return-only; proposed checkout/return wording alone must not silently change valid old behavior. |
| Q3 Staff all-history fields and reports | Approve named drivers, destination/project/note visibility, aggregate dimensions and export format; raw all-trip export is separately undecided. Minimize accounts/PII; organization-wide versus per-car access explicit. |
| Q4 User “history only” / operational home | Approve minimal selector/occupancy/currentOdo/profile exceptions and whether own export/report/fuel read is removed. Current Employee has own reports, so mapping is a behavior change. |
| Q5 Staff/User Maintenance | Does Staff manage plans/complete/correct history or only read reminders? Who sees history/costs? Does User receive safety reminders? Recommend deny unapproved writes/cost fields; no inferred Staff Admin. |
| Q6 Review lifecycle and communication | Who may approve/reopen, reason retention, duplicate applications, status-only login versus no session, pending password recovery, notification method (in-app only unless separately approved), queue capacity/rate limits (current200-account limit includes pending if stored together). |
| Q7 Identity proof and relink | Responsible reviewer/roster, duplicate-name policy, one-to-one account/Person link, inactive Person handling and open-trip/uncertain-operation reconciliation. No identity documents/secrets in application audit by default proposal. |
| Q8 Legacy Employee/Admin/root cutover | Explicit cohort mapping/approval status, missing-role handling and unchanged historical ownership; no automatic conversion. Root remains a separately governed recovery/admin exception, not a signup result. |
| Q9 Compatible state/backup/audit format | Approve additive lifecycle/link/review metadata, versioning/old-reader refusal, restore quarantine and stable actor IDs; only then implement/test a reversible offline migration plan. |
| Q10 Rollout/rollback and acceptance owner | Assign policy version/reviewer, approve RC cases and compatible rollback strategy; offline implementation authorization separate from all deferred cloud/data/deploy approvals. |

Recommendation: next task **3D.4B — Owner policy decisions and contract approval (design review)**. After those decisions, request a narrowly scoped **3D.4C offline compatibility/migration test spike** before implementing roles/onboarding. No new security framework, Operator setup or cloud work is needed to review this contract.
