# Task 3D.4D-3 — Admin-verified Person linking (DEV/OFFLINE)

## Task 3D.4D-4 lifecycle/recovery follow-up (current)

[SESSION_PERSON_RECOVERY.md](SESSION_PERSON_RECOVERY.md) implements the proposed local lifecycle/reload work: inactive Person checkout refusal/own open return, stronger receipt reader/current authorization, session-bound metadata-only recovery pointer, explicit read-only original-result check after refresh, unknown-result no-resubmit, logout/expiry/account isolation and Thai UX. New63 cases/29 total suites plus Edge desktop360/390/multi-tab acceptance. First-link-only Admin workflow, immediate signup/login, historical IDs/ownership, v4/schema3 backup and Staff restrictions are unchanged. No automatic unknown reset/relink/manual data-changing reconciliation is enabled; operational work remains DEFERRED.

Date: 2026-11-10 Asia/Bangkok. Repository kritsuwan1/smart-fleet; branch dev/smartfleet-batch-1. Policy v1.1 unchanged: account signup/login is immediate; Admin verification concerns vehicle eligibility only. No approval queue, Staff activation, automatic Employee conversion or identity-document retention.

## Prerequisites and boundaries

Verified implementation 824a4214fbb019fa1ff30e12d7a406945be08fdc, exact Linux run [42761789176](https://github.com/kritsuwan1/smart-fleet/actions/runs/42761789176) / job129648950771 success, Ubuntu24.04.5 Node24.22.2 with27 suites/60 signup cases; docs-only follow-up68a3f90de623bbcd1e4df33a4158bbc08e9e7890 changes4 documentation files. Read AGENTS and all requested policy/architecture/progress/roadmap/test documents. All103 executable inputs matched this remote baseline before work. Local checkout has accumulated earlier-task changes and an older Git HEAD; publication uses an explicit scoped tree based on the verified remote Development head, with a compare-and-swap branch update. No local staging-all, reset or unrelated changes are included.

## First-link contract

Admin uses existing Account management and existing POST /api/fleet action account:

```json
{"version":8,"action":"account","data":{"operation":"linkPerson","id":"EXACT_ACCOUNT_ID","personId":"EXACT_PERSON_ID","confirmed":true}}
```

The displayed account ID/username and selected Person ID/name must be reviewed; changing either clears confirmation. Names are display text, never identity keys. Server revalidates current Admin authorization and Fleet version, exact input keys and true confirmation. Target must be active unlinked self-user v3. Person ID must select exactly one active Person. Any other account's claim, including disabled legacy accounts, reserves the Person and refuses linking.

Existing linkage, target-owned open trip, candidate Person's open trip, target's operation ledger entry, malformed/unknown ledger scope or ledger-query failure refuses without mutation. A committed result can have a lost client acknowledgement: this task conservatively treats any target ledger entry as requiring review, without deleting, reconciling or reclassifying it. Only first linking is implemented; unlink/relink and special historical-conflict resolution require separate owner review.

Successful linking updates one account plus the state format marker and adds one audit event atomically under existing main CAS. Two concurrent claims cannot both win. Credentials, display names, Person records, trip IDs/ownerUserId/driverId, cars, Maintenance and existing ledger rows are preserved. Review metadata is limited to Person ID, acting Admin account ID and server timestamp; no evidence document or identifier scan is retained. The audit contains before/after linkage. An Admin statement records verification, not cryptographic proof of real-world identity; human checking quality remains an operational responsibility.

## Version and session contract

- Unlinked self-user v3 remains driverId=null, accountKind=self-user, role=user, status ACTIVE/DISABLED/REJECTED, raw active=false.
- Linked self-user v4 has driverId=exact Person ID, and exactly personVerification:{personId,verifiedBy,verifiedAt}; canonical ISO timestamp and valid reviewer reference. Raw active=false remains the old-auth deny fuse. Current effective activation uses status, never raw active.
- Mixed snapshots use top-level accountFormatVersion=4 once linked data exists. Later signup adds v3 without downgrading the marker. Legacy accounts are unchanged. JS/storage/JSON/SQL readers enforce exact accepted versions, valid linkage and unique claim. A Person later becoming inactive blocks new checkout through existing validation; own open-trip return remains possible. Disabled/rejected account always denies access.
- Linking increments passwordVersion. Existing User cookies and stale in-memory actors fail. Newly issued User cookies bind the current Person ID with a signed link digest; even a direct linkage change with unchanged passwordVersion refuses an old cookie/currentUser. Admin role/status/password operations retain existing revocation. Operation replay revalidates current role, actor, verified driver, ownerUserId, payload fingerprint and session epoch before returning the old receipt.

## User data and operations

| Scope | Unlinked User | Linked User |
| --- | --- | --- |
| Signup/login/profile/password/logout | Immediate | Immediate |
| Vehicle checkout | Denied | Own verified Person, active car/Person, keyed operation, existing Trip validation |
| Return | Denied | Own open trip only; end/odoEnd only, departure details immutable |
| Trip edits/history amendments | Denied | Denied, including own closed trip |
| History/personal PDF/Excel | Denied | Exact ownerUserId only; no driverId/name inference or historical backfill |
| Basic Maintenance | Denied | Active vehicle plan ID/car/type/due date/due odometer/calculated status only |
| Full Fleet/other history/directory/maintenance costs/history/backup/import/admin | Denied | Denied |

The verified-user DTO is constructed from an allowlist: public operational car fields/current odometer, own Person, own trips/projects, empty audit and no accounts/sessionKey/fuel data/full Maintenance/unknown Fleet extensions. Other occupancy is only car IDs; names/trips are omitted. Report data comes solely from this projection. Local-only User PDF skips the external fuel-price endpoint and hides its controls. Existing report-font and vehicle-image paths become available only after User linking; no new public route is created. Admin/Employee projections and permissions remain unchanged.

User writes require operation ID and current linkage, prohibit another owner's trip before ledger lookup, and permit checkout or own return only. Existing atomic ledger+main CAS, same-ID exact-payload replay and receipt logic are reused. No second write follows a lost response. Return cannot change project/destination/note/reason/car/driver/departure/odoStart/owner/sequence. User cannot elevate role or manage Staff. No new endpoint is added.

## Backup and rollback compatibility

JSON schema1 remains legacy; schema2 remains v3; schema3 explicitly carries v4 mixed state and SHA-256. Unversioned or downgraded v4 files, incompatible accounts/link metadata and duplicate claims reject before restore mutation. SQL backup source/target guards use the same strict reader policy. Offline SQL checker additionally pins the exact previous v3 guard by SHA-256 (fixture account-guard-v3.txt), alongside the existing v1 pin; this does not permit arbitrary SQL. Automatic backup retains its envelope and calls the shared state inspector; empty isolated restore rotates sessionKey. No restore HTTP route is added.

3D.4D-2 readers intentionally refuse marker4/schema3. This Development change does not fix an old deployed binary. Do not run mixed old writers, remove markers/verification, turn raw active=true, delete history/ledger or downgrade linked data. No transparent rollback to v3 is approved. For local experiments use a separate isolated pre-link fixture or retain a v4-capable reader. Any future operational rollback needs reviewed complete-state/ledger/session recovery and separate deployment authorization; no real migration/restore is performed here. Main-only backups retain the existing limitation that operation ledger rows are separate and are not a complete runtime rollback archive.

## Validation evidence

Windows x64 Node24.22.1: npm ci (via npm launcher) PASS42 installed/audited43, reported0 vulnerabilities; build Demo1034472/Production1033098/Staging1033245 bytes; typecheck PASS. Existing install-script restrictions unchanged. All28 automated suites include81 new Person-link cases,60 signup,171 reader guards,102 historical compatibility,45 transaction and163 value-validation cases. Final full28-suite run PASS. Exact implementation d71caf4d84d01ed9cd4b3c1c0362a96014434286 verified by Linux CI [42765792924](https://github.com/kritsuwan1/smart-fleet/actions/runs/42765792924), job129661858865, completed/success on2026-11-10 13:02 Asia/Bangkok: Ubuntu24.04.5/Nodev24.22.2, npm ci/build/typecheck/all28 suites PASS including81 Person-link/60 signup/171 guard/102 historical compatibility/45 transaction/163 validation cases. Exact head_sha and decoded logs checked; Linux bundle sizes Demo1033424/Production1032050/Staging1032197 bytes; install reported0 vulnerabilities. This docs-only evidence follow-up leaves tested executable inputs unchanged.

person-link.test.mjs exercises actual Worker auth/API with in-memory SQLite, signed synthetic cookies, entire schema/row rejection snapshots, explicit confirmation, inactive/missing/duplicate/claimed IDs, root and non-root Admin, open trips, malformed/target ledger, denied roles, same/different-ID concurrency, no relink, session/link/status revocation, own-only data, immutable return, JSON/SQL guard parity, old-reader refusal, SQL/automatic isolated restore with key rotation, and correctly rehashed incompatible automatic artifact refusal before any target mutation.

Optional person-link-browser.mjs: actual built Worker/Edge157.0.4341.42, separate Admin/User browser contexts at1280/360/390px; signup/login, explicit-ID review, old cookie401, linked checkout/return, double submit and commit-then-dropped-response retry, basic reminders, personal PDF download, no horizontal overflow/page errors. Only loopback synthetic data; all browser external requests blocked. Native mobile, live TLS, real identity verification, real accounts and cloud behavior are NOT_VERIFIED.

## Next scope and unresolved operational work

Propose 3D.4D-4: dedicated synthetic account/link lifecycle regression and session-expiry/conflict/error UX acceptance, including cross-tab/reload pending operations and disabled Person return. Do not add relink, evidence retention, Staff activation or account conversion without scoped owner decisions. Operator/Live/Initialize/Deployment remain DEFERRED. No Cloudflare API/credentials/real D1/Production/Demo resources, R2/Cron/public URL, initialization, deployment or merge was accessed or changed.
