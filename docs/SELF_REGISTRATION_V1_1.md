# Task 3D.4D-2 — Self-registration Policy v1.1 (Development only)

2026-11-10, Asia/Bangkok. Branch dev/smartfleet-batch-1. Owner supersedes **only Q6** of Policy v1.0: signup grants immediate personal-account access as User, without Admin approval. Q1–Q5/Q7–Q10 remain unchanged, including verified exact Person linkage before vehicle/history access and no Employee conversion.

**Implemented offline/local: immediate unlinked User account. No PENDING queue, no Person claim, no vehicle-operation activation for new accounts. Operator/Live/Initialize/Deployment remain DEFERRED.**

## Prerequisite and scope

Reverified implementation cdd610e1683747e18718c4ba2dc5bb4ea2cac856 and exact Linux CI41966113822/job127043386817 PASS (Ubuntu24.04.5/Node24.22.1,26 suites/164 guard cases). Development HEAD before work454565f90e211f99b228dae91892d85d657ef63c, documentation-only follow-up; all99 source/script/test/package/build inputs matched. Read AGENTS and required contract/compatibility/architecture/roadmap/progress/test docs.

No Cloudflare API/real credentials/real D1/resources, Production/Demo changes, initialize/deploy/merge or R2/Cron/public-URL activation. Source changes affect only this Development branch; compiled variants are exercised locally, not deployed.

## Account access is separate from Person access

POST /register now calls registerSelfUser. Existing name/username/password validation, six-to128-character passwords, PBKDF2-SHA256100000 iterations, random salt, HMAC session, secure cookie, rate limit, same-origin/body limits, account/payload limits and optimistic CAS remain. Submitted role/status/Person/employee identifiers are not accepted into the account. Signup always assigns User; it never calls Person-name matching or creates a Person.

A successful signup issues a session immediately and redirects to /. Login for this account also redirects to /, never an operational returnTo/QR deep link. Failed credentials remain denied. Duplicate normalized usernames and existing duplicate-account display-name constraint remain (name is only a validation/display field, never identity proof); matching one or many Person names grants no link/history. Concurrent registration cannot overwrite accounts/trips or create duplicate usernames.

GET /api/fleet returns only:
~~~text
{scope:'self-account', user:{id,username,name,role:'user',driverId:'',passwordVersion},
 actor:ownName, personLinked:false}
~~~
No Fleet state, version/activity counter, cars, people, projects, trip IDs/history, reports, Maintenance, directory, audit, hashes/salts or session key. App renders the reused personal ProfilePanel/password workflow and an explicit unlinked/operations-unavailable notice, with no vehicle/dashboard/report/admin controls or data prefetch. It ignores operational QR parameters.

All /api/fleet writes from this User are denied403 PERSON_LINK_REQUIRED **before version/idempotency lookup or business writes**, including forged return of an existing owned/unowned trip. Worker denies backup/status/fuel/report fonts/QR management/other protected routes. Only existing root app/assets, self-scope Fleet GET, own-password endpoint and logout/public auth pages are used; no new route is introduced.

Own-password change verifies current password, rotates salt/hash, increments passwordVersion, clears cookie and requires login again. Admin can disable/re-enable or reset this User password through existing authorized actions; old sessions never revive. REJECTED cannot be re-enabled by a generic toggle. New User role edit/promotion/linking is fail-closed and disabled in UI; no Staff role/runtime or new role-assignment workflow is introduced. Existing legacy Admin-controlled Employee↔Admin actions remain unchanged. Public signup cannot assign Staff/Admin under any input.

## Versioned representation and strict readers

Existing Account objects/IDs/links/permissions are untouched. The additive Fleet marker accountFormatVersion=3 is set only when a new self-account is committed. Mixed snapshots retain all legacy accounts as-is and contain:
~~~text
{...existing credential/profile fields,
 accountFormatVersion:3, accountKind:'self-user', role:'user',
 status:'ACTIVE'|'DISABLED'|'REJECTED', driverId:null, active:false}
~~~
status is authoritative for this recognized version only; ACTIVE means personal-account access, not Admin approval or verified driver identity. No PENDING state is created or accepted for this format. The historical metadata-only v2/spike models remain unactivated.

active:false is a deliberate **legacy-auth deny fuse**, not a disabled current User: pre-gate login/session readers required active=true, so cannot admit this account by coercing unknown user→employee. Current accountEnabled/strict accountRole implement the exact versioned semantics; Admin member/status counts use the same effective predicate. Mutating role, active, driverId, format/kind or adding unverified Person metadata rejects the incompatible snapshot rather than deriving privileges. Unrecognized status/version/role still fails closed. Legacy active=false and new DISABLED/REJECTED are denied without role fallback.

Every new User remains unlinked in this release. driverId must be null; the server does not accept a user-supplied or manually guessed link. A later separately scoped Admin verification/link workflow must define trusted evidence and the matched User operation/history/report/reminder projection before admitting a linked record. Therefore this task implements the required identity gate by **denying all Person-linked activity**, not by fabricating verification. No claim that vehicle operation becomes available immediately or that Admin can link a User in this build.

## Backup, restore and rollback

Shared JS/storage/source/target-SQL account guards recognize this exact v3 mixed format. User credentials are kept in the same private Admin-only Fleet backup, not omitted into an unbacked side store. createBackup retains schemaVersion1 for legacy snapshots; v3 snapshots require schemaVersion2/checksum. Old schemaVersion1 JSON inspectors refuse the new envelope. inspectBackup refuses downgraded/unversioned v3 artifacts, invalid Person/role/status/active combinations even after checksum recomputation, before restore mutation. SQL-generated guards and automatic-artifact inspection reuse the same contract; valid isolated SQL/automatic restore retains all accounts/legacy history and rotates session key.

Existing main-only ledger exclusion/session-epoch restore limitation remains; no pruning or cross-restore replay claim. Synthetic tests compare original People/trips/ownerUserId/driverId/cars/Maintenance/legacy accounts and retained operation rows, and exercise existing Employee same-ID concurrent return/replay across registration with exactly one committed return.

The immediately preceding3D.4D-1 reader refuses top-level version3. Older pre-gate authentication is denied by active=false for self-accounts, but **old writers/Admin tools must never share the new snapshot**: they could misinterpret/edit metadata. This task does not fix deployed binaries or certify a mixed-version rollout. Arbitrary/old SQL restore files are not secured retroactively.

No SQL schema migration or existing-account conversion is required/performed. Rollout remains unapproved: use an isolated matched version/runtime and separately approved data plan, never a shared old writer. After a new User exists, do not downgrade/strip version/status fields, flip active=true, map it to Employee or restore an older snapshot that loses new accounts/trips. Stop writes and resolve pending keyed operations before any future approved compatible forward fix/rollback. No data-loss downgrade is offered; legacy data alone remains readable by prior readers.

## Test evidence

- New tests/self-registration.test.mjs:60 cases in npm test (27 suites). Signup/6 and128 boundaries/duplicates/concurrency/role+identity spoofing, no Person matching/creation, exact self DTO/isolation, all forbidden routes/writes, login/password/logout-related sessions/revocation/disabled/rejected states, Admin management restrictions, strict JS/SQL invalid-state parity, schema1/2 backup and isolated SQL/automatic restore, forged root cookie, existing legacy session/history/operation ledger and same-ID replay.
- Existing account/role/report regressions now seed explicit historical Employee fixtures via tests/fixtures/legacy-account.mjs, restricted to SQLite :memory:. They still test actual legacy login/ownership/promotion/demotion/exports/restore and revocation; new registration is tested separately as User. No application legacy signup backdoor is kept. Staging signup assertion now expects restricted User. Guard suite expands164→170 through additional denied metadata fields;102 historical v1.0 model/45 transaction/163 value-validation and remaining security suites retained.
- Optional tests/self-registration-browser.mjs: actual Edge157.0.4341.42 at360px PASS. Real Worker forms, native six-character validation, immediate signup signed Secure/HttpOnly cookie on trusted loopback, restricted own-profile React UI, forbidden Fleet/backup requests, logout, failed/correct login and own-password change; no horizontal overflow, no page errors, unchanged Person/trip/legacy data. All external requests aborted; no identity injection or relaxed cookie flags. Local loopback cookie behavior is not proof of production HTTPS/TLS/physical mobile/iOS Safari; those remain NOT_RUN.
- Windows x64 Node24.22.1 npm ci PASS42 installed/audited43/reported0 vulnerabilities (existing esbuild/workerd script restrictions unchanged); build PASS Demo1019703/Production1018329/Staging1018476 bytes; typecheck PASS; all27 suites PASS including60/170/102/45/163. No lint script. No dependencies/lockfile change.
- Legacy SQL checker compatibility: the exact generated v1 guard from cdd610e is pinned by SHA2568ec22b69bbe7891d2642d79c4336102b887e7f1712cce4e43800082b10ad0229; tests/fixtures/account-guard-v1.txt records public SQL policy only. Existing legacy backup rehearsal PASS; altered guard correctly rejected (PASS). No general SELECT or SQL acceptance is relaxed.
- Exact implementation 824a4214fbb019fa1ff30e12d7a406945be08fdc verified by Linux CI [42761789176](https://github.com/kritsuwan1/smart-fleet/actions/runs/42761789176), job129648950771, completed/success on2026-11-10 12:23 Asia/Bangkok: Ubuntu24.04.5/Nodev24.22.2, npm ci/build/typecheck/all27 suites PASS including60 self-registration/170 guard/102 historical compatibility/45 transaction/163 validation cases. Exact head_sha and decoded logs checked; Linux bundle sizes Demo1018655/Production1017281/Staging1017428 bytes, install reported0 vulnerabilities. This docs-only evidence follow-up leaves the tested executable inputs unchanged. Optional browser command:
~~~text
node --experimental-sqlite tests/self-registration-browser.mjs .qa/browser/node_modules/playwright "<approved local browser executable>"
~~~

Browser harness corrections were test-only: re-enter username after the existing failed-login screen resets it, select password inputs by their labeled IDs, and compare serialized synthetic baselines (undefined optional fields are absent in SQLite JSON). No security control was relaxed to pass browser checks.

## Remaining scope / next task

Immediate account access does not verify employee identity. Admin-verified Person linking and subsequent User vehicle/history/personal-report/basic-reminder capabilities need the next scoped implementation; no auto-link, queue or bypass exists. Staff/new-User promotion remains disabled; existing legacy Admin/Employee permissions continue. Duplicate display names across accounts remain the existing validation constraint.

Propose3D.4D-3: design and implement an authenticated Admin-only exact-Person verification/link workflow with immutable historical ownership, trusted audit evidence, session invalidation and pending-operation reconciliation; then minimally activate approved verified-User scopes with direct API/mobile regressions. Any resource/data migration/deploy remains separate approval. Operator/Live/Initialize/Deployment stay DEFERRED.
