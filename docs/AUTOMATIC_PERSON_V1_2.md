# Automatic Person provisioning — Policy v1.2 / Task 3D.4D-7

Owner-approved change recorded 2026-11-10. Development/offline only. Supersedes v1.1 manual Person verification requirement **for NEW registrations only**. Signup remains immediately active User; no approval queue. This does not establish employee identity. Existing v3 unlinked Users stay restricted; existing v4 Admin-linked Users and legacy Admin/Employee stay unchanged.

## Atomic contract

POST /register validates the existing display-name/unique-username/password (6–128 characters) rules, CSRF/origin and rate limits. The server generates distinct UUIDv4 Account/Person IDs, salt/hash and canonical ISO timestamp once per attempt. No client-supplied role/Person/owner/verification fields are used.

The new Account uses accountFormatVersion:5, accountKind:self-user, role:user, active:false, status:ACTIVE, driverId:new Person UUID and personProvisioning:{personId,method:"self-registration",createdAt}. active:false is the existing old-role safety sentinel; status determines v3/v4/v5 access. Person is active:true and has accountProvisioning:{accountId,method:"self-registration",createdAt}. Metadata has exactly these three keys; IDs and timestamps must match reciprocally. No personVerification/verifiedBy is fabricated. Both ID namespaces are checked for collisions. Name equality never selects an existing Person.

Account + Person + signup audit are one Fleet JSON UPDATE under the existing version CAS. Up to three bounded CAS attempts reread state and recheck limits/uniqueness; generated IDs stay stable within that attempt. A failed update creates neither record. A session is issued only after commit. A lost signup response can mean committed signup; do not blindly register again—try normal login/recover through existing account procedure. Registration does not add a new idempotency ledger.

Fleet marker5 supports mixed legacy/v3/v4/v5 records. JS storage/auth readers and generated SQL guards enforce reciprocal provenance/UUID/status/role/unique claim. Admin Person edits retain system provenance; toggling an unchanged provisioned display name does not claim a same-name historical Person. Name changes still obey account validation. Historical account/Person/trip/ownerUserId/driverId/car/audit/maintenance/ledger rows are preserved.

## Authorization, sessions and recovery

New User gets linked own-data scope: checkout with active Person, return of own open trip under existing inactive-Person return rule, ownerUserId-only history/personal reports, minimal maintenance reminders. Own Person DTO includes id/name/active, not provisioning metadata. Existing wire scope label verified-user denotes operational eligibility, **not human identity verification**; user.personLinkSource distinguishes self-registration from admin.

No full Fleet/accounts/directory, other-user history, costs/history, backup/import, Staff/Admin promotion. Forged role/driver fields are ignored at signup and denied at operations. Signed cookies, passwordVersion/status/session checks, session-key rotation, CAS/operation ledger and same-ID replay authorization remain. Disabled/rejected accounts deny session/API/replay; inactive Person cannot start checkout. Unknown outcomes retain existing bounded browser pointer/read-only reconciliation/no-resubmit behavior. No reset/unlock/Admin ledger discovery; Task 3D.4D-6 SKIPPED.

## Backup and rollback

JSON backup schemaVersion4 is mandatory for Fleet marker5 (legacy1, v3→2, v4→3 unchanged). SHA-256 alone is insufficient: account/provenance/chronology validation runs before restore writes. Automatic backup envelope stays unchanged but shared inspectors enforce v5. SQL exports use the matching strict reader. Historical SQL guards v1/v3/v4 remain exact pinned fixtures; v4 pin SHA256 b431d846d01416a856a4a5961395fde4754ffe28203ff0d68809a0cfc6f29c03. CRLF normalization only; altered guard rejected.

Old v4 runtime/SQL reader refuses mixed marker5; it is not retroactively upgraded. Do not strip marker/provenance, convert v5 to Employee/v4, delete new records or backfill historical ownership to roll back. A mixed-format snapshot requires a compatible reader. Pre-change snapshots may be rehearsed only in isolated synthetic SQLite; reverting real data would discard subsequent writes and needs separate owner review. No DDL/schema migration or actual restore executed.

## Offline acceptance and reproduction

Windows Node24.22.1: npm ci (42 added/43 audited, zero vulnerabilities), build, typecheck, npm test. In this tool shell npm is reached via pnpm dlx npm; Windows user setup uses npm normally.

31 suites include real HTTP signup60, operational guards172, historical Person-link81, recovery63 and automatic-person66 cases. Provisioning suite covers no-orphan capacity/CAS conflict/throw/retry/collision, immediate checkout/return, concurrent same-ID writes, lost-response timeout retry, cross-account denial, disabled/inactive state, JS–SQL parity, rehashed invalid automatic backup refusal before mutation, SQL/automatic isolated restore/session rotation and old-reader refusal. Fixtures are synthetic in-memory SQLite only.

Actual Edge157.0.4341.42, synthetic local Worker: preview-local-browser at1280/360/390 signup→Thai success→logout/login→checkout→return→own history/PDF/basic reminders; Admin maintenance and explicit historical-v3 linking; no overflow/errors/external requests. self-registration-browser additionally tests password validation/change and forged-driver denial. Historical Person-link/recovery browser fixtures explicitly seed v3 snapshots rather than misrepresent new signup.

Commands:

```powershell
npm ci
npm run build
npm run typecheck
npm test
npm run preview:local
```

Preview http://127.0.0.1:8787, RAM-only synthetic data, Ctrl+C stops. New signup needs no manual link; preview.unlinked intentionally remains v3 for legacy tests. Browser automation additionally needs an operator-installed Playwright and Edge; example: node --experimental-sqlite tests/preview-local-browser.mjs .qa/browser/node_modules/playwright "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe" 390.

Exact-commit Linux evidence is recorded in PROGRESS.md after push. Mock/browser PASS does not verify real accounts, credentials, TLS/Cloudflare/D1, deployment or operational capacity. Operator/Live/Initialize/Deployment DEFERRED; no cloud, R2/Cron/public-route changes. Next scoped task: owner review of v1.2 lifecycle/duplicate-display-name UX and synthetic acceptance, before any separate operational approval.

