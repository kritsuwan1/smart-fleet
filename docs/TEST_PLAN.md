# SmartFleet - Test Plan

## Safe Windows Local Preview enablement

New preview-local.test.mjs28 cases, total30 npm test suites: exact IPv4 loopback/port contract, Host/Origin/cross-site/absolute-target refusal, self-only CSP/no external font links, actual synthetic auth/secure cookie, scoped User and unlinked User, blocked QR/backup/import/recovery/reset paths, UTF-8 request reconstruction, denied fetch/WebSocket, per-process memory/session isolation and occupied-port refusal. No app security flags weakened; no new dependencies/config/resources.

Windows clone regression: self-registration suite retains60 cases and now rehearses both exact frozen v1/v3 SQL guards under LF and CRLF, including modified-guard refusal for each. Offline checker canonicalizes only these line endings before pinned hashing, preserving current guard/payload policy. This fixes the D-drive checkout failure; no application changes.

Optional preview-local-browser.mjs uses the real Staging Worker bridge and Edge157.0.4341.42 with separate Admin/User contexts; desktop/360/390 signup/login/explicit Person link/checkout/return/own history/PDF/Maintenance PASS, no page errors or external browser requests. Windows Node24.22.1 build/typecheck/all30 suites PASS. Actual npm preview startup8787 verified; process continues until Ctrl+C, no DB files persist. Exact final code a9d6fb7091d7ccee83e6f917dbb40a2529268218 verified by Linux CI [42827299619](https://github.com/kritsuwan1/smart-fleet/actions/runs/42827299619), job129867849307, completed/success on2026-11-10 20:45 Asia/Bangkok: Ubuntu24.04.5/Node24.22.2, npm ci/build/typecheck/all30 suites PASS including28 preview/63 recovery/81 Person-link/60 signup cases. Exact head_sha and decoded logs checked. Actual owner clone D:\\smart-fleet fast-forwarded, Windows Node24.22.1 build/typecheck/all30 suites PASS after CRLF fix (bundles Demo1050639/Production1049265/Staging1049412 bytes). Edge157.0.4341.42 opened actual127.0.0.1:8787/Admin synthetic dashboard with zero external requests. Ctrl+C printed shutdown message; after Y batch confirmation,8787 refused connections. Docs-only evidence follow-up leaves tested executable inputs unchanged. This verifies preview enablement only;3D.5 remains separate and3D.4D-6 SKIPPED. No live cloud/native-device/deployment claim. [LOCAL_PREVIEW_WINDOWS.md](LOCAL_PREVIEW_WINDOWS.md).

## Task 3D.4D-5 — manual support design acceptance (NOT_RUN)

[MANUAL_UNKNOWN_OPERATION_RECOVERY.md](MANUAL_UNKNOWN_OPERATION_RECOVERY.md) defines25 future synthetic specifications M01–M25, not implemented tests and not additional PASS counts. Cover exact original receipt vs attempt-only rejection, unknown/late commit, lost pointer/tab/storage/logout/device, auth/Person changes, same-name/unowned history, Admin actor-namespace restriction, future bounded discovery, corrupt/cross-epoch/stale evidence, forged/replayed decisions, audit/CAS races, future terminal fencing, minimized support data and desktop/360/390 accessibility. Every review/deny must preserve full Fleet/accounts/people/trips/Maintenance/audit/ledger/schema snapshots; only separately approved support-audit deltas may be permitted.

Current task reverified exact Linux42793628897 on b920532 (29 suites/63 recovery cases) and reran existing synthetic session-recovery63 + transaction-reliability45 on Windows Node24.22.1 PASS. No new test/fixture/source file; no fresh build/typecheck/full29/browser claim. Future unlock/reset and read-only Admin discovery require separate owner approval; their acceptance remains NOT_RUN/NOT_IMPLEMENTED. Existing v1.1 authorization, CAS/replay, v4/schema3 backups and legacy Admin/Employee regressions remain required. Operator/Live/Initialize/Deployment DEFERRED.

## Task 3D.4D-4 — lifecycle/reload recovery (current)

New session-recovery.test.mjs63 synthetic cases; total29 suites. Require expiry boundary/passwordVersion/disable/reject/link/epoch/role denial for writes and receipt lookup, concurrent disable during ledger read, inactive Person cannot checkout but own open return works, separate/same-ID checkout/return CAS, corrupt ledger refusal/no mutation, owner-only lookup/unknown privacy, unchanged legacy/account/backup/ledger data. Scope binds only the authenticated session, ignoring unrelated cookies.

Check one bounded sessionStorage pointer before POST: no payload/credentials/Fleet/identity fields,8h expiry, malformed/extra/array-ID/wrong-scope/clock/storage failure refusal and identifier scrub; logout/account isolation; no new ID or POST after reload/unknown, original receipt only after validated confirmation. Same-page retry keeps original ID, including a later401/403/409 after unknown. Test delayed original commit after unknown, real timeout, dropped responses and tampered acknowledgements. No automatic discard/reset after expiry/logout; fail-closed tombstone.

Optional actual Worker Edge browser: node tests/session-recovery-browser.mjs .qa/browser/node_modules/playwright "PATH_TO_EDGE". Desktop1280/mobile360/390, refresh, two-tab checkout/return,15s timeout/lost response, read-only network failure/recheck, inactive Person, disabled controls, logout scrub/new login and expired-session Thai UX; synthetic only/external requests blocked. Prior linking/signup browsers remain regression checks. Exact implementation b920532040873b9e2f8dfc904fd505f1da4adbaa verified by Linux CI [42793628897](https://github.com/kritsuwan1/smart-fleet/actions/runs/42793628897), job129753062809, completed/success on2026-11-10 16:48 Asia/Bangkok: Ubuntu24.04.5/Nodev24.22.2, npm ci/build/typecheck/all29 suites PASS including63 lifecycle/recovery,81 Person-link,60 signup,171 reader guard,102 historical compatibility,45 transaction and163 value-validation cases. Exact head_sha and decoded logs checked; Linux bundle sizes Demo1050553/Production1049179/Staging1049326 bytes; install reported0 vulnerabilities. This docs-only evidence follow-up leaves tested executable inputs unchanged. Operational/cloud/native-device verification remains deferred; operational/cloud/native-device verification remains deferred. Contract/limits: [SESSION_PERSON_RECOVERY.md](SESSION_PERSON_RECOVERY.md).

## Task 3D.4D-3 — verified Person/User access (current)

[VERIFIED_PERSON_LINKING.md](VERIFIED_PERSON_LINKING.md) supersedes the previous task's unlinked-only operational limit; signup remains immediate. Required regression: Admin current authorization + explicit IDs/confirmed selection; missing/inactive/duplicate/claimed IDs; disabled/rejected target; target/unknown ledger and open-trip refusal; no name claim/relink; two-account same-Person CAS; audit/identity/legacy/ledger preservation. New person-link.test.mjs81 synthetic cases, total28 suites.

Check signed-cookie/actor revocation after linking, changed Person and disabled/rejected status; own-only projected DTO/history/PDF/Excel by ownerUserId, never driverId/name; no full Fleet/account/credential/cost/history/private fields. Deny all forbidden routes/actions with complete SQLite schema/row snapshots. User must use keyed checkout/own return, immutable details, exact-payload replay/double-submit/different-ID conflicts; no partial writes/duplicates. v4 JS-SQL parity, old-v3 refusal, schema3 integrity, valid isolated SQL/automatic restore/session rotation and rehashed invalid automatic backup rejection before target mutation.

Optional browser: node tests/person-link-browser.mjs .qa/browser/node_modules/playwright "PATH_TO_EDGE". Actual Worker/secure synthetic signed cookies and separate contexts, desktop1280/mobile360/390, signup/unlinked denial, Admin review, session401/login, User checkout/double submit/lost response retry/return, reminders/personal PDF, no overflow/page errors. External requests blocked. Exact implementation d71caf4d84d01ed9cd4b3c1c0362a96014434286 verified by Linux CI [42765792924](https://github.com/kritsuwan1/smart-fleet/actions/runs/42765792924), job129661858865, completed/success on2026-11-10 13:02 Asia/Bangkok: Ubuntu24.04.5/Nodev24.22.2, npm ci/build/typecheck/all28 suites PASS including81 Person-link/60 signup/171 guard/102 historical compatibility/45 transaction/163 validation cases. Exact head_sha and decoded logs checked; Linux bundle sizes Demo1033424/Production1032050/Staging1032197 bytes; install reported0 vulnerabilities. This docs-only evidence follow-up leaves tested executable inputs unchanged. Browser PASS does not verify physical mobile, actual operator, identity proof or Cloudflare.

Operator/Live/Initialize/Deployment DEFERRED; no real DB/API/credentials/resources. Historical task evidence below remains historical.

## Task 3D.4D-2 — Policy v1.1 immediate User account regression

New self-registration.test.mjs60 cases, npm test27 suites: immediate account activation without queue/approval, six-to128-character passwords/hashes/session cookies/rate limits, caller privilege/Person spoof denial, duplicate/concurrent identities, zero Person creation/matching/history takeover, exact self-only DTO, forbidden routes/writes before ledger lookup, own-password/session revocation/disabled/rejected handling, Admin restrictions, v3 JS/SQL parity/schema2 backup/restore, legacy data and same-ID replay.

Accounts/roles/reports suites now seed historical Employee fixtures explicitly in memory; no new production legacy-registration path. Existing legacy scope/role/owner/backup/security assertions retained. Staging registration now expects restricted User. Guard suite170 cases (expanded metadata denials); historical v1.0 model102, transaction45 and validation163 retained. Policy v1.1 supersedes only Q6; no new pending queue or implicit verification is tested as implemented.

Optional self-registration-browser.mjs actual Edge157.0.4341.42 at360px PASS: real Worker forms and signed Secure cookie on loopback, signup/immediate own-profile, wrong/correct login/logout/password change, no horizontal overflow/page errors, denied Fleet operations/backup and preserved old data. External requests blocked/no identity injection; no real TLS/mobile-Safari/cloud claim. Command/setup and limitations in [SELF_REGISTRATION_V1_1.md](SELF_REGISTRATION_V1_1.md).

Windows Node24.22.1 ci/build/typecheck/all27 suites PASS. Exact implementation 824a4214fbb019fa1ff30e12d7a406945be08fdc verified by Linux CI [42761789176](https://github.com/kritsuwan1/smart-fleet/actions/runs/42761789176), job129648950771, completed/success on2026-11-10 12:23 Asia/Bangkok: Ubuntu24.04.5/Nodev24.22.2, npm ci/build/typecheck/all27 suites PASS including60 self-registration/170 guard/102 historical compatibility/45 transaction/163 validation cases. Exact head_sha and decoded logs checked; Linux bundle sizes Demo1018655/Production1017281/Staging1017428 bytes, install reported0 vulnerabilities. This docs-only evidence follow-up leaves the tested executable inputs unchanged. New User remains unlinked, all Person vehicle/history/report scope denied; verified-link and new User promotion workflow NOT_IMPLEMENTED. Operator/Live/Initialize/Deployment DEFERRED.



## 2026-11-10 — Task 3D.4D-1 revalidation

Repeated request rechecked against existing implementation cdd610e and docs e78e0a4; all99 executable/script/test/package/build inputs identical to remote. Fresh Windows x64 Nodev24.22.1 npm ci/build/typecheck/all26 offline suites PASS, including164 operational compatibility/102 spike compatibility/45 transaction/163 value-validation cases. No source/test changes or new role/signup activation.

Exact [Linux CI41966113822](https://github.com/kritsuwan1/smart-fleet/actions/runs/41966113822)/job127043386817 re-fetched: Ubuntu24.04.5/Node24.22.1, head_sha=cdd610e1683747e18718c4ba2dc5bb4ea2cac856, all26 suites PASS. Its execution date remains2026-11-05; no new Linux run claimed for2026-11-10. This follow-up is docs-only (workflow paths-ignore); fresh Linux NOT_RUN. No new browser/UAT/real-cloud verification; existing compatibility/rollback limits and DEFERRED operational statuses remain.



## Task 3D.4D-1 — actual operational compatibility guard regression

New operational-compatibility.test.mjs164 cases, npm test26 suites. Exercise actual shared guard/storage/auth/session/Worker/API/manual+automatic backup and restore paths, not just3D.4C harness. Cases: strict version/role/status refusal and explicit missing-role legacy adapter, future metadata/status matrix, root shortcut/session issuance denial, no lazy/rate-limit/signup writes on bad state, no Fleet/member/body leakage, valid disabled/legacy behavior, candidate/stored-state refusal and version CAS, sanitized malformed JSON, JS/generated-SQL parity, complete schema/rows/version/ledger snapshots on refusal, valid SQL/automatic restore rotation, same-ID concurrent return/lost-ack/replay with one audit/odo change.

Retain102 compatibility cases,45 transaction and163 value-validation cases plus prior role/security/Backup/Maintenance suites. The historical unsafe-current-auth probe now verifies actual new refusal and explicitly models pre-gate behavior separately. Valid populated SQL-restore fixture uses full legacy Fleet; formerly skeletal {obsolete:true} is now tested as incompatible/no mutation. No security test is removed or made permissive.

Windows x64 Node24.22.1 npm ci/build/typecheck/all26 suites PASS. Exact implementation cdd610e1683747e18718c4ba2dc5bb4ea2cac856 verified by Linux CI [41966113822](https://github.com/kritsuwan1/smart-fleet/actions/runs/41966113822), job127043386817, completed/success on2026-11-05 11:10 Asia/Bangkok: Ubuntu24.04.5/Node24.22.1, npm ci/build/typecheck/all26 suites PASS, including164 operational guard/102 compatibility/45 transaction/163 value-validation cases. Exact head_sha and decoded logs checked; Linux bundle sizes Demo1013875/Production1012501/Staging1012648 bytes, reported0 vulnerabilities at install. This docs-only follow-up leaves the tested executable tree unchanged. No lint script; no fresh browser/UAT/cloud execution. [ROLE_ONBOARDING_COMPATIBILITY.md](ROLE_ONBOARDING_COMPATIBILITY.md) records scope and rollback limits. Unsupported state is denied as a whole; no future role/lifecycle state is operationally accepted.

No claim that old deployed readers now refuse new state. Their coercion is a historical model; actual new-reader guards and legacy rollback compatibility are tested offline. No migration/account conversion/new routes, Staff/User/PENDING signup/review activation. Mixed-version cutover, future credential/root adapters and full new-policy RC-01–12 remain separate work. Operator/Live/Initialize/Deployment DEFERRED.



## Task 3D.4C — approved Policy v1.0 compatibility regression

Owner-approved Q1–Q10 now supersede the historical 3D.4A unapproved draft. [ROLE_ONBOARDING_COMPATIBILITY.md](ROLE_ONBOARDING_COMPATIBILITY.md) describes test-only model/gates and remaining operational blockers. New role-compatibility.test.mjs + synthetic fixture:102 cases, npm test25 suites. No operational role/signup/auth/schema changes.

Cases cover strict role/status/version/reader denial; complete legacy Fleet/IDs/ownerUserId/driverId/history/ledger preservation; pending null links/no name matching; Admin-only exact Person approval and separate assignment; unauthorized/duplicate/inactive claims; Staff/User own-return/no-amend, User reports/basic reminders and Staff Maintenance/minimized all-history totals; role×status cross-product; actual old coercion/backup acceptance probes; correct-checksum invalid security/chronology/odo refusal before any synthetic write; atomic SQLite migration/restore/rollback fault snapshots; stale concurrent review CAS and no lossy rollback after changes. Actual unchanged authorizeOperation/maintenanceStatus/backup semantics are reused. External fetch tripwire remains zero.

Fresh Windows Node24.22.1 npm ci/build/typecheck/all25 suites PASS (new102 / transaction45 / validation163 and prior security/account/Maintenance/Backup). Helper node --check PASS; .mjs runtime tests are separate from src-only TypeScript check. Exact implementation fef56f8865ba2a8b3e280271a2d06f02f57f9301 verified by Linux CI [41963063663](https://github.com/kritsuwan1/smart-fleet/actions/runs/41963063663), job127033697190, completed/success on2026-11-05 10:40 Asia/Bangkok: Ubuntu24.04.5/Node24.22.1, npm ci/build/typecheck/all25 suites PASS, including102 compatibility/45 transaction/163 validation cases. Exact head_sha and decoded job logs checked; Linux bundle sizes Demo1007946/Production1006572/Staging1006719 bytes, reported0 vulnerabilities at install. This documentation-only evidence follow-up does not change tested executable inputs. App bundle sizes unchanged. No new browser acceptance run or real identity proof claim.

The old binary has NOT gained a version gate; rejection is in the isolated harness and new state is never given to it. Actual readers/credentials/registration/review/route/UI RC-01–12 acceptance remain NOT_IMPLEMENTED/NOT_RUN. Unknown-role coercion in current auth must not be used for v2. Operator/Live/Initialize/Deployment remain DEFERRED.



## Task 3D.4A — proposed role/state acceptance contract (DESIGN ONLY)

[ROLE_ONBOARDING_CONTRACT.md](ROLE_ONBOARDING_CONTRACT.md), sections3–9, defines the action/data matrix and planned RC-01–12 cases. They are NOT_IMPLEMENTED / NOT_RUN in this task; policy remains NOT_APPROVED. Current Admin/Employee tests passing does not establish Staff/User/PENDING support.

Future coverage after owner approval: Admin/Staff/User/explicit legacy Employee × PENDING/APPROVED/REJECTED/DISABLED, anonymous/stale/unknown/root cases; every route/action/data scope must have authorized and unauthorized fixtures. Validate complete synthetic state/version/ledger and response redaction, not only hidden buttons. Test no-name-only Person claiming, concurrent approval/claim conflicts, immutable historical ownerUserId/driverId, legacy mapping, backup/status format rejection before mutation, session revocation, other-trip write denial for Staff, and3D.3 replay when role/status/link changes. UI includes no operational prefetch while pending, read-only all-history details, truthful review/transaction results and mobile360px+.

Actual this-task Windows x64 Node24.22.1 build/typecheck/existing24 suites PASS; transaction45/validation163 and prior auth/roles/backup/Maintenance/security remain green. No tests/source/dependencies changed; no new browser test or npm ci/audit run. Exact baseline Linux [41953314810](https://github.com/kritsuwan1/smart-fleet/actions/runs/41953314810), f51efec80a20fbcc6c2a6d97cb9436b9d5e09554, reverified from metadata/decoded logs: Ubuntu24.04.5/Node24.22.1/ci-build-typecheck24 PASS. New docs-only CI NOT_RUN under paths-ignore. Operator/Live/Initialize/Deployment DEFERRED; operational NOT_VERIFIED.




## Task 3D.3 — atomic transaction result replay / client uncertainty

- Prerequisite verified: exact3D.2 implementation77b3607 expected files, a57bf7d docs-only follow-up and Linux41755017762 PASS all23 suites. Baseline old API reproduced checkout duplicate200/409/lost-reply retry409 and fresh-version Admin return retry changing version2→3.
- New transaction-reliability.test.mjs: 45 scenarios in npm test (24 suites). Same-ID duplicate/concurrent checkout/return => original result, one main/audit/odo change; changed payload/car/kind =>409/no write; stale/fresh-version replay, JSON key order, user namespaces, disabled/demoted/foreign-user denial, invalid ID/intent/odo, competing vehicles/global CAS and retry of actual loser. No test assumes which concurrent request wins.
- Atomic SQLite batch faults at each of3 statements =>rollback/no orphan; lost batch ack =>readback; missing batch =>503/no sequential fallback. Primary-first session, concurrent revocation, capacity refusal, malformed ledger and actual offline Miniflare D1 batch concurrency tested. Replay reads Fleet after locating stored result to avoid stale authorization snapshots; previous23 suites retain auth/env/schema/validation coverage.
- Client tests: same-task latch, stable ID/payload on lost/timeout/late replies, no automatic retry, changed intent blocked while unknown, original return receipt, 400/401/403/409/503 outcomes, malformed acknowledgement/state withheld from success. Replayed receipt remains original while fresh scoped state may show later return. IDs in memory only; reload/restore/legacy-client limits explicit in TRANSACTION_RELIABILITY.md.
- Optional transaction-browser.mjs actual Edge156.0.4314.58, 360px, isolated loopback/synthetic SQLite/injected identity: same-task double start submits one POST; intercept response after committed return then abort to create deterministic lost reply; unknown form/close/cancel disabled; explicit double retry sends one same-ID request; unchanged version2/data, one trip/two audit/two ledger rows. This is not actual cloud auth/physical mobile acceptance; uses existing ignored Playwright, no app dependency added.
- Windows Nodev24.22.1 npm ci/build/typecheck/all24 suites PASS, new45 and prior validation163/security/Maintenance/Backup/permissions suites PASS. No lint. Exact implementation f51efec80a20fbcc6c2a6d97cb9436b9d5e09554 Linux CI [41953314810](https://github.com/kritsuwan1/smart-fleet/actions/runs/41953314810), job127002142499, completed/success on 2026-11-05 09:09 Asia/Bangkok: Ubuntu 24.04.5 / Node v24.22.1; npm ci, build, typecheck and all24 suites PASS, including45 transaction cases and163 validation cases. Decoded job logs and exact head_sha checked; no prior-run substitution. Linux build sizes Demo1007946 / Production1006572 / Staging1006719 bytes. Documentation-only follow-up does not change tested executable inputs. Public D1 batch contract reviewed; real provider/Operator/Live/Initialize/Deploy remain DEFERRED/NOT_VERIFIED. Migration/rollback compatibility and remaining retention/reload risks documented; no live SQL or rollback run.



## Task 3D.2 — shared value validation and no-mutation recovery regression

- Prerequisite 3D.1 verified before development: acbc8bf exists as Development HEAD with exactly eight docs-only changes. Both source bugs first reproduced with failing new assertions (backupRejected=false / carStatus=200), now reject (true / 400).
- Added tests/validation-consistency.test.mjs, 163 cases, npm test total 23 suites. Covers shared Trip chronology/strict calendar/minute timestamps, open/closed odo shape and 0–99999999 bounds, manual current/legacy backups, valid absent optional fields and long legacy notes/unknown data, car creation/edit valid numeric strings and invalid/boundary inputs. No unrelated overlap/text/continuity business validation added to backup inspection.
- Invalid automatic artifacts have correctly recomputed SHA256, metadata counts and byte sizes; 20 variants each tested against both empty-main and populated synthetic SQLite targets. Assert zero SQL run calls and identical complete schema/rows/payloads/versions, including sentinel records, on refusal. Valid local restores retain all state except existing session rotation. Raw arbitrary SQL is not covered by this JS validator; no actual restore authorized.
- Car invalid API inputs return 400 with no effective row/version/audit mutation; accepted 0/max and existing numeric strings check the exact created/edited car, expected car count and version. Valid Trip boundary/equal/leap/cross-year/reason cases retained. Environment/auth/security/schema guards unchanged.
- Actual Windows x64 Node v24.22.1: npm ci/build/typecheck/all 23 suites PASS. New 163 and existing broker 75 / security 64 / adapter 48 / reserved 61 / initialization 28 / operator fixtures 133 plus feature tests PASS. No lint script or fresh browser-device test. Exact implementation 77b3607 Linux CI [41755017762](https://github.com/kritsuwan1/smart-fleet/actions/runs/41755017762) PASS: Ubuntu 24.04.5 / Node v24.22.1, npm ci/build/typecheck/all 23 suites incl. new 163. Decoded logs checked; no prior-run substitution. Operator/Live/Initialize/Deployment DEFERRED, actual NOT_VERIFIED.

The 3D.1 D1/D2 findings below are historical reproduced defects now addressed by 3D.2; their former planned cases are implemented. 3D.3 submit/confirmation remains next. Details: [DATA_VALIDATION_CONSISTENCY.md](DATA_VALIDATION_CONSISTENCY.md).



## Task 3D.1 — feature audit, current results and next regressions

- Owner defers Operator setup/Cloudflare Live/Staging Initialize/Deployment. Existing broker/signature/operator Mock tests stay enabled as software regressions; their PASS is not an operational/live status. No new cloud/operator work is scheduled. Live NOT_READY, actual verification NOT_VERIFIED.
- Actual Windows x64 Node v24.22.1 build/typecheck/npm test PASS all 22 existing suites, no code or test additions. Covers core trips, imports, accounts/roles, metrics/PDF structure, static mobile/history/profile/receipt markup, Backup/Maintenance, local workerd/SQLite and Mock D1/security scenarios. No lint script. New audit Linux CI NOT_RUN (docs-only paths-ignore); unchanged executable baseline aac550a has successful run 41612678919, Ubuntu 24.04.5/Node v24.22.1/all 22 suites.
- Two extra unchanged-source synthetic probes REPRODUCED defects: inspectBackup accepts a correctly checksummed trip with departure 10:00/return 09:00 although validateTrip rejects; car API accepts/persists initialOdo=100000000 but Trip at that odometer is invalid. These expected safety checks FAIL and are not covered by the existing green suites. No real/persistent DB or credentials involved. See FEATURE_AUDIT_3D1.md for evidence and limitations.

Planned regression matrix (implementation separately scoped; no cases added in this audit):

| Priority / next task | Cases and acceptance | Existing regressions to retain |
| --- | --- | --- |
| P1 / 3D.2 Backup semantic checks | Valid envelopes/legacy/missing optional Maintenance fields accepted; invalid end-before-start, impossible calendar date, malformed open/closed odo, invalid bounds rejected. Inspect is read-only; no silent repair/filtering. Keep full synthetic source/target snapshots unchanged on refusal | backup-alerts, automatic-backup, maintenance, worker, environments; valid SQL/JSON restore and session rotation |
| P1 / 3D.2 Car input bounds | 0 and 99999999 accepted under existing rules; 100000000/negative/fraction/unsafe/nonfinite rejected client/server; rejected API write leaves version/cars/trips/Maintenance/audit unchanged | worker, import, trip-receipt, maintenance, accounts; no rewrite of historic cars/odo |
| P1 / 3D.3 submit/confirmation | Two same-task submit events => one request; delayed/out-of-order/lost reply, 409/401/offline outcomes; no blind retry/false receipt; exact persisted trip ID/plate/time/odo on success | Existing server CAS/ownership, trip receipts and Maintenance useRef duplicate guard |
| P1 decision / 3D.4 permissions | Approve Admin/Staff/User matrix and legacy Employee mapping/signup policy first; then pending/invite/driver-claim/direct API/session/data-scope cases | accounts, roles, profile, maintenance Admin/Employee redaction; no self-promotion |
| P1/P2 / 3D.5 mobile | Local synthetic 360/390/768/1280, complete checkout-return-receipt/Maintenance/profile/report/backup flows, long Thai strings/focus/keyboard/orientation/network failures; no document-wide overflow | Static UI tests plus optional maintenance-browser harness; identity injection stated; no claim of physical iOS/Safari |
| P2 / 3D.6 reports | Cross-month/open/closed/empty/multi-car metrics, employee scope, local Thai font/PDF render and download failures; only owner-approved trend/range/cost enhancements | reports, role scope, import, backup; no real fuel/network calls in tests |
| P2 / 3D.7 multi-car/QR | Independent concurrent occupancy/odo/reminders/history/report filters, archive preservation, duplicate plate and occupied deactivation denial; proposed QR exact car/environment host refusal | receipt two-car tests, import car matching, maintenance car isolation; no actual Production/Demo QR/public route change |

Fresh browser/physical-device/PDF visual testing NOT_RUN in this audit. Historical Maintenance browser evidence is bounded to its loopback/injected-identity harness. Actual Cloudflare/operator/storage/auth/TLS/remote recovery remain DEFERRED / NOT_VERIFIED; no live tests are inferred from the 22 suites.



## Task 3C.2P — Operator-run verifier (OFFLINE ONLY)

- Added tests/d1-operator-offline.test.mjs, 133 cases; npm test now 22 suites. Separate processes exercise Staging/Recovery independently, no reset/cross-target reuse. Scope presentation precedes exact typed synthetic confirmation; missing/copied bootstrap, operator/host/model-storage refusal, unknown options/live/external-client/proxy/auth denial and piped/non-TTY CLI refusal.
- Both targets cover exact reserved/empty/empty-fleet success; redirects, permission/network, wrong identity, malformed/schema/occupied/write-metadata failures. Internal TLS certificate/hostname and DNS/connect/TLS/headers/body timeout/abort scenarios prove simulated fail-closed control flow only, not genuine TLS/I/O verification. Four requests maximum, no retry/retarget, no KV contents/counts. fetch tripwire zero; no new signing keys or credential access.
- Pure Windows storage model tests reject sync/checkout/network/reparse/noncanonical/stream/device paths, ownership/inheritance and broad ACLs; no real operator filesystem/ACL inspection or persistence. Evidence schema/redaction and externally held receipt detect tampering even after embedded digest recomputation. Actual operator/storage/auth/TLS/API remain NOT_VERIFIED, Live NOT_READY.
- Actual Windows x64 Node v24.22.1 build/typecheck/all 22 suites PASS, including new 133; N 64 / broker 75 / adapter 48 / reserved 61 / initialization 28 regressions unchanged. Interactive human rehearsal NOT_RUN by agent; noninteractive denial and synthetic confirmation model tested. Linux CI exact-commit results follow in PROGRESS.md. See OPERATOR_OFFLINE_VERIFIER.md for offline use and operational blockers. No lint script.



## Task 3C.2O — Live security architecture review (DESIGN ONLY)

- Documentation-only review; no new security code/tests/CLI/config/allowlist. [LIVE_SECURITY_ARCHITECTURE_REVIEW.md](LIVE_SECURITY_ARCHITECTURE_REVIEW.md) defines A/B decision gates and future acceptance for isolated operator identity, fixed package/bootstrap, credential least privilege, exact HTTPS request policy, complete I/O deadlines/abort, proxy/CA refusal, private non-sync journal/evidence, redaction/tamper/ACL/reparse/storage failures and separate targets.
- Actual new Windows x64 Node v24.22.1 Build/Typecheck/npm test PASS all 21 suites, including N 64 security, M broker 75, adapter 48, reserved 61 and initialization 28 cases. No lint script. All 94 checked tracked executable/build/test/config/workflow inputs match remote ff80d24 (Task N source unchanged); generated ignored src/client.bundle.txt excluded.
- Latest Linux baseline run 41378250206 remains completed/success for exact executable f0c0109 (Ubuntu 24.04.5 / Node v24.22.1, 21 suites/64 N cases; prior decoded evidence in PROGRESS.md). New O Linux CI NOT_RUN because changes are docs-only and paths-ignore applies. No fresh Linux execution claimed.
- Future implementation must pass Windows/Linux regressions and adversarial offline transport tests before separately approved real-network/TLS/auth checks. Mock success does not satisfy actual host/operator/permission/TLS/API gates. Design review PASS; live / initialization / deployment NOT_READY. No Cloudflare calls/credentials or operational changes.


## Task 3C.2N — Offline signed approval and transport

- Added tests/d1-offline-security.test.mjs to npm test (21 suites), 64 cases: Ed25519 public test-vector signature checks; unknown/revoked/wrong keys, forged/unsigned/modified scope, expiry/clock rollback/post-claim expiry, budget/copy/cross-target refusal, atomic replay across two Node processes and sealed evidence tamper/field checks. No real operator key/credential is generated/read; no runtime signer exists.
- Approval-gated transport delegates only to Mock broker, with scope check and durable nonce claim before any mock metadata, then signed budget/expiry before each request. Live/auth/credential/proxy/URL/abort options are refused or covered by unchanged M policy; no network client. Real TLS/operator enrollment/storage/authentication NOT_VERIFIED.
- Actual Windows Node v24.22.1 Build/Typecheck/all 21 suites PASS; old broker 75/adapter 48/reserved 61/initialization 28 still PASS. Linux evidence follows publication. See D1_OFFLINE_APPROVAL_TRANSPORT.md for real trust bootstrap/credential/TLS/store/source blockers, independent Staging/Recovery approvals and unchanged NOT_READY status.

## Task 3C.2M — Mock-only Broker

- Added tests/d1-broker.test.mjs to npm test (20 suites), 75 cases: both targets, exact host/account/UUID/method/body/SQL/order, default mock/live denial, no injected network/credential options, permission/network/identity/schema failures, redirect/abort/concurrency/budget/replay/expiry refusal and redacted evidence persistence/no-overwrite/hash.
- Shared the unchanged pure schema policy between planner and broker. Broker response fixtures are JSON only; no _cf_KV table/value/count operations or Cloudflare calls. Global fetch tripwire verifies zero calls. No SQL executor, initialization or deploy method is exposed. Mock manifest checker cannot authorize live mode.
- Actual Windows Node v24.22.1 Build/Typecheck/all 20 suites PASS; existing adapter 48/reserved 61/initialization 28 fixtures remain PASS. Offline Staging and Recovery CLI rehearsals PASS with separate ignored mock evidence files. Linux evidence follows in PROGRESS.md. See D1_MOCK_BROKER.md for limits and future live approvals.

## Task 3C.2L — Live read-only preparation / account scope

- Found request-scope gap: prior adapter/verifier accepted another syntactically valid account before schema checks. Tightened both to the already-approved Account ID; new tests assert wrong valid-format account produces zero transport/read calls. No Account/DB tuple added.
- Related suites PASS: adapter 48 Mock fixtures, reserved schema 61, initialization safety 28. Existing redirect/wrong-identity/query/permission failure tests remain passing. Adapter fixtures use the public approved identifier in fake responses; exact reserved-schema acceptance and altered-schema refusal reflect the K policy. No live credentials/network/protected-table data.
- Actual Windows Node v24.22.1 Build/Typecheck/all 19 suites PASS. Linux evidence follows publication. Operator approval, authenticated transport/broker review and evidence recorder are planned in LIVE_D1_VERIFICATION_PREPARATION.md, not implemented live capabilities. No Cloudflare API call; actual metadata/schema/permission/authentication NOT_VERIFIED.

## Task 3C.2K — Verified reserved schema compatibility

- Added tests/d1-reserved-schema.test.mjs to npm test (19 suites): 60 Mock cases cover exact approved-account/provider capability and DDL acceptance for both targets, strict generic/raw rejection, copied/forged/expired/wrong-target identity, malformed/altered/null DDL, extra columns/objects, duplicate names, same-name views and occupied preservation. Existing adapter 47 / initialization 28 fixtures remain PASS.
- Evaluate actual SQL guards with synthetic sqlite_schema CTEs, never create or read _cf_KV. Compare planner/SQL acceptance and assert schema/payload preservation on refusal. Duplicate metadata regression initially exposed a parity gap; duplicate-name/null-safe SQL guard fixes pass final validation. No real database or protected-table changes.
- Actual Windows Node v24.22.1 Build/Typecheck/all 19 suites PASS. Linux evidence follows publication in PROGRESS.md. User-confirmed Dashboard evidence is recorded separately for Staging/Recovery dated 2026-11-01; live API verification NOT_VERIFIED, initialization NOT_READY. See D1_RESERVED_SCHEMA_COMPATIBILITY.md.

## Task 3C.2I — Reserved-table schema evidence

- Added ten metadata-only Mock cases to the existing read-only adapter suite: five each for Staging/Recovery, covering the documented _cf_KV definition alone/with fleet_store, altered DDL, same-name view and additional user table. All must refuse under the unchanged strict Allowlist, send only sqlite_schema SELECT and never query/create/modify _cf_KV or count its rows.
- Actual Windows Node v24.22.1 Build/Typecheck/npm test PASS all 18 suites; adapter fixtures now 47, initialization-safety fixtures 28. No runtime/schema/config/SQL guard changes. User-supplied unlabelled schema description is not live identity/emptiness evidence; per-target Dashboard/API confirmation remains NOT_VERIFIED. See D1_SCHEMA_EVIDENCE_REVIEW.md for source and conditional policy proposal. Linux evidence follows in PROGRESS.md.

## Task 3C.2H — D1 read-only adapter

- Added tests/d1-readonly-adapter.test.mjs to npm test (18 suites): 37 Mock/SQLite fixtures cover exact provider Account/UUID/name identity, both allowlisted targets, binding/config refusal, unknown schema/occupied data, permission failure at all request stages, network/query/JSON/redirect/result failure, unexpected write metadata and config mutation isolation.
- Capture every request: only two fixed metadata GET endpoints and same-target query POST with one of two exact read-only SELECTs. No arbitrary SQL, payload reads, write/resource/deploy endpoints, credentials or default live transport. Existing 28 initialization-safety fixtures remain PASS.
- Actual Windows Node v24.22.1 Build/Typecheck/all 18 suites PASS after correcting a Mock-only mutable identity fixture. No app/schema/dependency/config/SQL-initialization changes. Linux CI result follows publication in PROGRESS.md. User confirmed Dashboard schema has not been checked; actual Cloudflare and database emptiness remain NOT_VERIFIED. See D1_READONLY_PREFLIGHT.md.

## Task 3C.2F — Initialization safety regression

- Added tests/d1-initialization.test.mjs to npm test: 17 suites total. 28 fixtures cover both staging/recovery empty targets, exact empty fleet_store, unexpected user tables/views/indexes/triggers/provider-like objects, incompatible schema, occupied/repeated targets, identity/binding/account failures and malformed/query errors.
- Preflight reads sqlite_schema and row counts only; rejected targets issue no writes and identity failures issue no query. SQL assertion errors before DDL preserve entire synthetic schema/rows on unrelated-table targets. Repeated/occupied initialization now throws with unchanged data; existing staging suite updated accordingly.
- Actual Windows Node v24.22.1 build/typecheck/all 17 suites PASS. No Cloudflare/real DB initialization. See D1_INITIALIZATION_SAFETY.md for strict schema allowlist, point-in-time/concurrency limitations, operator prerequisites and unverified provider internals. Linux result is recorded separately in PROGRESS.md; no inference from Windows.

## Task 3C.2B — Approved dependency compatibility

- User-approved parent upgrade: Wrangler 4.116.0, Miniflare 4.20260730.0, scoped sharp 0.35.5/undici 7.30.1; ws 8.21.0 supplied by parent, esbuild 0.28.1 deduplicates old vulnerable copy. Production lock entries unchanged; no force fix, app source/config/schema change or real Cloudflare access.
- Actual full audit before Critical 0 / High 3 / Low 1; after all severities 0, exit 0. Fresh production-only audit 0, exit 0. B1 dependency gate resolved for this snapshot; remaining cloud/setup/deploy gates stay pending.
- New tests/toolchain.test.mjs is appended to npm test (16 suites): resolved version pins/Node 24, native sharp PNG/JPEG/resize, undici HTTP/ws echo on loopback, Miniflare/workerd ephemeral D1 query persistence, and actual compiled Staging Worker login/role protection/synthetic D1/maintenance create-complete-correct/manual backup/disabled automatic backup and QR. No R2 binding/real services required. Test login uses redirect:manual, preserving auth behavior.
- npm ci/build/typecheck/all 16 suites PASS on Windows Node v24.22.1. Native workerd smoke compatibility date is 2026-07-30 (supported local runtime); provider config-date/real cloud integration remains NOT_RUN. New Linux CI result is recorded by SHA/run/log evidence in PROGRESS.md. No lint script exists.
- No Deploy/Merge/Production/real DB/Secrets/environment/resource/R2/Cron changes. Security remediation success alone is not a Staging deployment authorization.

## Task 3C.2A — Safe rollback fix / remaining blockers

- New regression initially FAIL: invalid plan creation threw but left maintenancePlans mutated in the caller. Fixed changeMaintenance with staged maintenance-field copies and commit-after-validation for all operations. Invalid plan and invalid completion now preserve the full input state; earlier history-correction/manual-override rollback checks remain. Success rules, API roles, schema and vehicle/trip logic are unchanged.
- Actual Windows Node v24.22.1 npm ci/build/typecheck/npm test PASS, still all 15 suites. Optional local Edge history-correction/mobile/double-submit checks PASS. New Linux CI evidence is recorded in PROGRESS.md after commit.
- Fresh audit remains FAIL: Critical 0 / High 3 / Low 1; production-only audit PASS (zero). No safe patch-only closure confirmed; explicit breaking-change proposal is documented in BLOCKER_RESOLUTION.md and was not installed. No force fix or package/lockfile change.
- Local config entrypoint/bindings/exact user UUIDs/separation/no-R2/no-Cron/QR isolation verified. Actual provider identities/Worker/access/secrets/initialization/recovery/UAT remain NOT_VERIFIED/NOT_RUN and are blockers, not inferred PASS. Overall NOT_READY; no real initialization/deploy/rollback command run. Full risk/evidence/FIXED/REMAINING/approval inventory: [BLOCKER_RESOLUTION.md](BLOCKER_RESOLUTION.md).
- Gate sequencing clarification: security/identity/target/access/containment and deployment approval are pre-deployment gates. Remote Staging integration/recovery/UAT are post-deployment acceptance checks whose plan must be approved first; they are not a circular prerequisite to uploading the first isolated Staging version. R2/Cron remain unnecessary for the explicitly no-R2 mode.

## Task 3C.1 — History correction and no-R2 Staging readiness

- Prerequisite Task 3B Linux run 41283265689 PASS for 346f4db7be6f7fee3755b68ea81d562a9cd4b4b9, 14 suites, Node 24.22.1; logs verified.
- Maintenance suite now tests Admin correction/audit, immutable record identity, employee denial, stale version rejection, negative-cost rollback, chronological bounds, older-record edits not changing the current schedule, latest-derived due recalculation, manual-plan override rejection with zero in-memory/persisted rollback damage, and archived one-off plan preservation. The previous unsupported-history test now checks unknown-ID rejection; history editing is implemented.
- New staging.test.mjs is appended to npm test (15 suite files): no-R2/no-cron/private config properties and non-production IDs; source/recovery initialization on SQLite and rerun/occupied refusal; staging build label, QR disabled, Demo/Production host rejection, production marker rejection, synthetic fallback, Admin login and Employee write denial; scheduled handler disabled with unchanged source state. No cloud DB is accessed.
- Optional Edge browser test now fills/saves a history correction at 360px and checks satang cost/audit/original record identity and unchanged cars/trips; earlier responsive/double-submit checks remain. Local identities are injected; physical/Safari/remote Staging UAT remains NOT_RUN.
- Final Windows Node 24 build/typecheck/15 suites PASS; actual Linux result is recorded in PROGRESS.md. Security audit remains FAIL (High 3 / Low 1), actual existing D1 identities and remote initialization NOT_VERIFIED/NOT_RUN. Deployment remains NOT AUTHORIZED; do not infer Cloudflare readiness from SQLite tests. See STAGING_READINESS.md for future commands requiring separate approval.

## Task 3B — Maintenance review evidence

- Extended existing maintenance suite (still 14 npm test suites): nine-case date/km/either matrix, inactive-plan/car Employee response filtering, fresh-version duplicate retries, concurrent same-version writes (one 200 / one 409), unsupported editHistory request rejected without writes. Initial duplicate regression reproduced a 200 response where rejection was required; fixed by exact-match guards.
- Optional tests/maintenance-browser.mjs: local real React Dashboard + fleetApi + synthetic SQLite, identity injected. Edge 156.0.4314.58 actual browser PASS for plan add/edit, history creation/view, Employee read-only UI, two same-task submits yielding one request for both forms, and no document overflow at 360/390/768/1280px. At 360, plan/service forms and history were exercised and screenshots visually reviewed. Optional browser test is not part of npm test/Linux CI; setup/command are in MAINTENANCE_STAGING_REVIEW.md.
- npm ci/build/typecheck/all 14 suites PASS on Windows Node v24.22.1; final Linux results recorded in PROGRESS.md. No real cloud DB/credentials used.
- Acceptance FAIL: history editing NOT_IMPLEMENTED. Security gate remains High 3 / Low 1. Remote Staging D1/auth/access integration, real-device Safari/UAT NOT_RUN. Overall Staging deployment readiness: NOT READY; passing regression tests do not close these gaps. See [review/report](MAINTENANCE_STAGING_REVIEW.md) for PASS/FAIL matrix and required fixes. No deployment or resource activation authorized.

## Task 3A — Maintenance tests (current development)

New tests/maintenance.test.mjs is appended to npm test (14 suites total). Uses synthetic fleet state and independent in-memory SQLite; no schema/resources/production access.

| Case | Validation |
| --- | --- |
| MT-001 | Missing optional fields accepted; GET preserves legacy state without eagerly adding arrays |
| MT-002 | Per-car km/date/either urgency, exact thresholds, Bangkok day boundary, all five work types |
| MT-003 | Reject invalid dates/references/numbers, negative/fractional costs, oversized details, invalid recurrence and duplicate IDs |
| MT-004 | Complete/advance km or day cycles; archive one-off plans; retain history and car/trip data; disallow car reassignment/history regression |
| MT-005 | Admin writes/audit, employee write denial and history/cost redaction, stale version conflict and failed-write atomicity |
| MT-006 | Existing car/trip writes and import planning preserve maintenance; JSON/SQL/automatic backups retain it; isolated SQLite recovery matches full state except rotated sessionKey |
| MT-007 | Static UI role separation, empty state and escaped names; responsive CSS added with labelled controls/44px touch targets |

Actual Windows Node 24 build/typecheck/all 14 suites PASS; final Linux evidence is recorded in PROGRESS.md. Real browser form interactions, 360px mobile overflow/focus checks and Staging UAT remain NOT_RUN; static rendering does not replace them. Cloud R2/D1 integration remains NOT_RUN and R2 activation stays deferred. Security findings from Task 2B.1 remain open; test success does not authorize release.

## 1. Project Information
- Project: SmartFleet Vehicle Usage Web Application
- Baseline Version: v3.8.5
- Target Version: v4.2.0
- Repository: kritsuwan1/smart-fleet
- Test Environment: Isolated Staging
- Production Testing: Read-only checks unless explicitly approved

## 2. Testing Principles
1. Inspect the current source code before writing tests.
2. Reuse existing test frameworks and conventions.
3. Never run destructive tests against Production.
4. Use synthetic or anonymized test data.
5. Verify both success and failure scenarios.
6. Do not mark tests passed without execution evidence.
7. Record failed tests and unresolved issues.
8. Preserve all existing vehicle records.
9. Require approval before Production deployment.

## 3. Test Levels
- Unit Tests: Validation and calculation logic
- Integration Tests: API and database interactions
- End-to-End Tests: Complete user workflows
- Security Tests: Authentication and authorization
- Regression Tests: Existing functionality
- Restore Tests: Database backup and recovery
- UAT: User acceptance testing

## 4. Baseline Regression Tests - v3.8.5

### TC-001: User Login
Steps:
1. Open login page.
2. Enter valid credentials.
3. Submit login form.
Expected: Authorized user can access permitted pages.

### TC-002: Invalid Login
Steps:
1. Enter invalid credentials.
2. Submit login form.
Expected: Login is rejected without exposing sensitive information.

### TC-003: Vehicle Trip Recording
Steps:
1. Select vehicle.
2. Enter required trip information.
3. Submit the record.
Expected: Exactly one valid trip record is saved.

### TC-004: Odometer Validation
Steps:
1. Enter invalid odometer values.
2. Attempt to submit.
Expected: Invalid values are rejected without data corruption.

### TC-005: Trip Save Confirmation
Steps:
1. Save a valid trip.
2. Inspect confirmation screen.
Expected: Vehicle plate, saved time, odometer and detail navigation are correct.

### TC-006: Existing Data Integrity
Steps:
1. Record baseline counts and checksums.
2. Execute tests on isolated staging data.
3. Compare preserved historical records.
Expected: Existing historical records remain unchanged.

## 5. Security and Backup - v3.8.6

### TC-101: Scheduled Backup
Expected: Backup executes at the configured schedule.

### TC-102: Backup Retention
Expected: Retention follows the approved policy.

### TC-103: Backup Integrity
Expected: Backup artifact is complete and readable.

### TC-104: Database Restore
Expected: Backup restores successfully to an isolated test database.

### TC-105: Unauthorized Backup Access
Expected: Non-Admin users cannot access backup data or operations.

### TC-106: Backup Failure Handling
Expected: Failed backups are logged and notification is triggered.

### TC-107: Maintenance Verification
Expected: Existing maintenance reminders behave according to verified requirements.

### TC-108: Secret Protection
Expected: No credentials or private secrets are exposed in logs, code or backup downloads.

## 6. Mobile UX/UI - v3.9.0

### TC-201: Responsive Layout
Expected: No unintended horizontal overflow at 360px, 390px, 768px and desktop widths.

### TC-202: Mobile Trip Entry
Expected: User can complete the full trip workflow on a mobile device.

### TC-203: QR Code Entry
Expected: QR code opens the correct vehicle workflow.

### TC-204: Duplicate Submission
Expected: Repeated taps do not create duplicate records.

### TC-205: Save Confirmation
Expected: Correct saved values are displayed after submission.

### TC-206: Cross-Browser Compatibility
Expected: Critical workflows function in supported Chrome, Edge and mobile Safari browsers.

## 7. Dashboard and Reports - v4.0.0

### TC-301: Dashboard Summary
Expected: Total trips and distance match the underlying records.

### TC-302: Date Filtering
Expected: Filters return records within the selected date range.

### TC-303: Driver and Vehicle Filtering
Expected: Results match the selected driver and vehicle.

### TC-304: PDF Export
Expected: PDF opens correctly and includes accurate report data.

### TC-305: Excel Export
Expected: Excel opens correctly and contains accurate records.

### TC-306: Empty Data
Expected: Dashboard and reports handle empty results without errors.

## 8. User and Permission Management - v4.1.0

### TC-401: Admin Access
Expected: Admin can access authorized administration features.

### TC-402: Staff Access
Expected: Staff can access only permitted functionality.

### TC-403: User Access
Expected: User can access only permitted personal records.

### TC-404: Pending Approval
Expected: Unapproved accounts cannot access restricted pages or APIs.

### TC-405: Unauthorized API Access
Expected: Requests without required permissions are rejected.

### TC-406: Account Deactivation
Expected: Deactivated accounts cannot continue accessing protected resources.

### TC-407: Audit Logging
Expected: Important administrative changes are logged with appropriate metadata.

## 9. Multi-Vehicle Management - v4.2.0

### TC-501: Vehicle Creation
Expected: Authorized Admin can create a valid vehicle record.

### TC-502: Vehicle Data Isolation
Expected: Trips and odometer histories remain associated with the correct vehicle.

### TC-503: Vehicle QR Code
Expected: Each QR code identifies the intended vehicle.

### TC-504: Conflicting Trips
Expected: Conflicting active trips are rejected according to approved business rules.

### TC-505: Historical Migration
Expected: Existing vehicle 8กน3362 Bangkok records are preserved.

### TC-506: Multi-Vehicle Reports
Expected: Individual and combined reports calculate correctly.

## 10. Required Test Evidence
For each test run, record:
- Test ID
- Version and commit hash
- Environment
- Execution date
- Test result: PASS, FAIL, BLOCKED or NOT_RUN
- Relevant command or test method
- Error summary when applicable
- Evidence location

## 11. Release Acceptance Criteria
A release may be proposed only when:
1. Build succeeds.
2. Required automated tests pass.
3. No unresolved Critical or High security issues remain.
4. Critical business workflows pass UAT.
5. Existing historical records remain intact.
6. Backup and recovery requirements are verified where applicable.
7. Database migrations are tested on staging.
8. Rollback procedures are documented.
9. Production deployment receives explicit approval.

## 12. Deployment Safety
- Never automatically deploy Production during development.
- Never execute destructive migrations against Production.
- Never use Production credentials in staging.
- Never copy personal data into public test artifacts.
- Stop and request approval when a required operation could affect Production.

## 13. Test Reporting Template

Version:
Commit:
Environment:
Execution Date:
Tests Passed:
Tests Failed:
Tests Blocked:
Tests Not Run:
Known Issues:
Migration Required:
Rollback Plan:
Production Deployment Approved: NO

## 14. Current Test Status
Baseline verification: NOT_RUN
Batch 1 tests: NOT_RUN
Batch 2 tests: NOT_RUN
Batch 3 tests: NOT_RUN
Production deployment: NOT AUTHORIZED

## 15. Next Action
1. Inspect the actual source code and test infrastructure.
2. Map test cases to existing modules.
3. Identify missing automated tests.
4. Update ARCHITECTURE.md and PROGRESS.md.
5. Begin development on an isolated branch.

## 16. Task 2A - Automatic Backup development verification

The earlier NOT_RUN statuses describe the original planning snapshot. Current execution results are recorded in PROGRESS.md; mock/offline results do not imply a real R2/D1 or scheduled deployment was tested.

New suite: tests/automatic-backup.test.mjs, appended to npm test (13 suite files total). Uses synthetic state, in-memory SQLite, an R2 mock, mocked notifications and both built Worker variants.

| Case | Automated coverage |
| --- | --- |
| AB-001 / TC-101 | UTC cron constant and Bangkok date boundary; default-off handler; separate build/binding/environment markers |
| AB-002 / TC-103 | Full state and unknown legacy fields preserved, source version/counts/bytes metadata, SHA-256 of state and envelope, corrupt metadata/body/reference rejection |
| AB-003 | Immutable daily object, duplicate invocation, concurrent jobs, active/expired/stolen token leases, ambiguous successful put acknowledgement |
| AB-004 / TC-102 | Paginated retention, today plus six previous dates, exact boundary, environment/unrelated-key isolation, sole last-valid-copy preservation when new upload fails |
| AB-005 / TC-106 | Transient and persistent R2 failures, bounded retry count, read-back missing/corrupt, list/delete failures, D1 status failure fallback, retry from an existing valid artifact |
| AB-006 / TC-105/108 | Admin 200/employee 403/anonymous 401 status access, no authentication fields in status, raw failures/secrets excluded from logs and notification payloads, notification failure/unconfigured outcomes |
| AB-007 / TC-104 | Actual SQLite restoration into empty Demo-marked target, full normalized state equality/session rotation, production/occupied/corrupt targets rejected before writes, production-source-to-staging restore |
| AB-008 / TC-006 | Source main payload AND version unchanged after backup success/failure; missing main is never initialized |
| AB-009 | Offline CLI rehearsal uses a local temporary private fixture and in-memory DB; output excludes state/session/account secrets |

Before Staging activation (NOT_RUN in Task 2A):

1. Verify actual R2 bucket privacy, IAM/bindings/environment separation and absence of unsafe object lifecycle rules.
2. Run approved Staging cron and verify the actual 02:00 Asia/Bangkok timestamp; test provider retries, storage latency/timeouts and a process killed before status completion.
3. Inject Staging R2/D1/webhook failures, verify redacted provider logs, last-success-age monitoring and failure delivery.
4. Execute the documented empty-Staging-D1 recovery drill and compare historical trip/odometer/account integrity.
5. Review BackupPanel in a browser including disabled, never, running, success, failed and unavailable states.

No Production trigger/resource/configuration change, deployment, merge, migration or real restore is authorized by these tests.

## 17. Task 2A automated execution evidence

2026-11-01: Windows Node v24.22.1 build/typecheck/test PASS; then actual [Linux CI run 41275329310](https://github.com/kritsuwan1/smart-fleet/actions/runs/41275329310) on Ubuntu 24.04.5 / Node v24.22.0 passed npm ci, build, typecheck and all 13 test files, including AB-001 through AB-009 assertions in automatic-backup.test.mjs. Tested source commit: deeefc5ea498a7c3e564f702073eb830f84aaf88. Details and limitations are in PROGRESS.md.

These are mock/offline integration results. Real Staging R2/cron/webhook/D1 restore and browser UAT remain NOT_RUN; no production release or activation is implied.

## 18. Task 2C.3 — No R2 subscription / offline coverage

Reuse the existing bucket() Map mock and independent SQLite :memory: databases in automatic-backup.test.mjs. Run npm run test:backup:offline (build plus the existing backup suite); npm test still runs all 13 suites. See [BACKUP_OFFLINE.md](BACKUP_OFFLINE.md).

- AB-010: compare both state and envelope digests to independent Node crypto SHA-256.
- AB-011: create nine valid previous daily artifacts, create today's copy and assert exactly the seven current-window copies remain, validating each retained artifact.
- AB-012: inspect all repository Wrangler configs and backup examples for empty/absent cron lists and disabled/absent enable flags. This does not query deployed Cloudflare settings.
- Existing AB-001–009 cover failure injection, final-valid-copy retention, source preservation, redaction and actual offline SQLite recovery. Production-named scenarios use only synthetic data.

2026-11-01 Windows Node v24.22.1: offline command/build, typecheck and all 13 suites PASS. No R2 bucket, subscription, real D1 or credentials required. Cloud R2 integration and Staging D1 integration remain NOT_RUN. Future cloud provisioning, subscription, secrets, deployment and trigger activation each require explicit approval; no activation is implied by these results.
