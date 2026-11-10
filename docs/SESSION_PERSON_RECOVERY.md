# Task 3D.4D-4 — Session, Person lifecycle and uncertain-result recovery

2026-11-10 Asia/Bangkok. DEV/OFFLINE, kritsuwan1/smart-fleet, dev/smartfleet-batch-1. Policy v1.1 unchanged. Signup/login remains immediate; exact Person verification is Admin-only and first-link-only. No Staff activation, promotion, relink, identity retention, ownership backfill or data migration.

## Verified baseline and findings

Verified implementation d71caf4d84d01ed9cd4b3c1c0362a96014434286, documentation follow-up c32f92a5a3189b32dbbbee88d28a2e8832f2295d (only3 docs), exact Linux [42765792924](https://github.com/kritsuwan1/smart-fleet/actions/runs/42765792924) / job129661858865 completed/success, Ubuntu24.04.5/Node24.22.2,28 suites/81 Person-link cases. All109 source/script/test/package/build inputs matched the remote baseline before modifications, normalizing checkout line endings. Existing local unrelated historical documentation/working-tree changes are preserved; publication uses a scoped tree based on verified remote HEAD and a CAS ref update.

Existing secure HMAC cookie expiry (8h), passwordVersion revocation, v4 Person-binding checks, current account status/role, immutable User departure fields, transaction ledger+main CAS and scoped replay already worked. They are retained rather than replaced. The concrete gap was that pending operation ID/payload lived only in memory: reload after a lost acknowledgement discarded the operation identity. This task adds a minimal pointer and read-only reconciliation, not a second replay/authorization framework.

## Lifecycle and authorization

| Event | New checkout | Own open return / original-result lookup |
| --- | --- | --- |
| Linked active User + active Person | Existing validation/keyed operation | Own ownerUserId, driver/link/operation checks |
| Linked active User + inactive Person |403 PERSON_INACTIVE, clear Thai explanation, no write | Own open return remains allowed; reading an already committed receipt is read-only |
| Account disabled/rejected, passwordVersion revoked, changed verified Person, expired/invalid cookie | Denied | Old session denied before receipt or mutation |
| Current role/driver/owner no longer matches operation | Denied according to current scope | Replay/lookup denied; no old privileged receipt |
| Unsupported account format/role/status |503 fail-closed |503 fail-closed; no normalization/migration |

Lookup refreshes state/current authorization after ledger read and refuses an epoch change, including a concurrent disable. Normal User reports/history remain ownerUserId-only and reminder DTOs stay minimized. Legacy Admin/Employee valid behavior is unchanged. A new legitimate session can still read its authorized own history; revocation does not erase history/ledger. Browser automatic recovery is deliberately bound to the original session and does not resume after a new login.

## Server reconciliation contract

Existing GET /api/fleet additionally accepts exactly operationId=UUIDv4 and operationKind=start|return. No new route, SQL schema or account/backup version is introduced. Lookup uses the same account/session-epoch operation namespace, primary read session where available and existing authorization. It never retries, resubmits, updates Fleet, creates an operation row or returns another user's result. Known valid state is used; existing legacy missing-session-key initialization behavior is not redefined.

- confirmed: current authorized projection plus original immutable receipt/result and matching operation identity.
- unknown: current authorized projection, identity and unknown state. Absence is not evidence that a delayed request cannot still commit. There is no automatic cancellation or new operation ID.
- invalid query, revoked access, corrupt ledger or changed scope: refuse; do not clear uncertainty or mutate records.

Ledger reader validates receipt/result/kind/trip/car/driver/owner consistency, fingerprint shape, version and Trip values before projection. Existing valid format1 rows remain supported; malformed rows fail503, are never repaired/deleted. POST still checks exact request fingerprint. Lookup is read-only evidence of an existing commit, not a new write or proof that unknown means failed. Responses are no-store. No cookies, authorization headers, tokens or credentials are logged/persisted.

## Bounded browser metadata

One tab-scoped sessionStorage key smartfleet.trip-recovery.v1, maximum512 characters, stores only:

```text
{format:1, scope:<64-char opaque digest>, id:<UUIDv4>, kind:start|return,
 createdAt:<milliseconds>, expiresAt:createdAt+8h}
```

No payload, project/destination/note, Person/account ID/name, password, credential, authorization header, cookie, Fleet state or receipt is persisted. Recovery scope is a server-derived digest of current authorization/session epoch and the authenticated session cookie, not unrelated cookies. It is an opaque correlation tag, never an authorization capability. Same-origin sessionStorage is untrusted and readable by same-origin script; this is not protection against XSS or a compromised browser/OS.

Pointer is written and read back before POST. Unavailable/denied storage fails closed before sending. In-memory timeout/lost response retains original ID and exact payload for same-page retry. An earlier uncertain result remains uncertain even if a later retry returns401/403/409. Definite first-attempt validation/access/version failures can clear the pointer. Success clears it only after matching acknowledgement. Reload restores only the pointer: the client cannot reconstruct/resubmit a sensitive payload and cannot issue a fresh transaction while it exists. The explicit Thai action ตรวจสอบผลรายการเดิม performs a bounded15-second GET. No polling/unattended retry is added.

Confirmed, matching authorized evidence clears the pointer and displays the original receipt. Unknown/network failure/timeout/corrupt response keeps the gate. Session change, expiry, future clock, malformed/extra fields or wrong account scope removes identifiers and replaces the record with {blocked:true}. This bounded identifier-free tombstone does not automatically expire into permission to retry. No UI dismiss/clear/relink/abandon-unknown shortcut is provided. Manual reviewed reconciliation is required when the pointer cannot be safely used; a reset procedure/business policy is not invented here.

Logout intent/form submission scrubs pointer identifiers and broadcasts an ephemeral same-origin logout signal to other open application tabs. Tabs with uncertainty retain only the tombstone; tabs without pending state remove the key. Expired-session redirect also scrubs identifiers. New login/account scope cannot inherit or replay the old pointer. Broadcast contains only the literal logout, with no identifiers/credentials, and is a UX cleanup signal rather than authorization. Server cookie/status/version checks remain authoritative, including when browser messaging is unavailable.

## Multi-tab, expiry and recovery limits

Independent tabs may generate different IDs for genuinely separate actions; existing Fleet CAS/overlap/open-return validation permits only one conflicting commit. Copied same-ID intents return the original result. Reload reconciliation never writes. A delayed original request can commit after a client timeout; unknown therefore stays locked until confirmed or reviewed. Browser tests cover separate-tab checkout and return races as well as a real15-second client timeout.

Expiry is checked and identifiers scrubbed on access; a suspended/closed browser cannot guarantee physical erasure at a wall-clock deadline. sessionStorage is per tab/browser session: full tab close, storage clearing, different browser/device, tampering or OS compromise is not durable global recovery. No cross-device/global account lock is claimed. Server CAS/ledger/ownership validations still protect conflicting writes, but lost local evidence may require a reviewed ledger/history check. Closing the tab or clearing storage is not a reconciliation procedure. Session rollover/logout/expiry intentionally prioritizes privacy and fail-closed behavior over automatic resumption. No operational manual-reset workflow is activated in this task; design one separately with owner review before such a workflow is needed.

Do not downgrade to the old client while unresolved pointers exist; the older client ignores the UX marker. Storage/account/backup formats and ledger rows are not migrated. Existing v4/schema3 backup/restore guards, session-key rotation and older-reader refusal are retained. Main-only backup still excludes separate ledger rows and is not a complete runtime rollback archive. No real restore or rollback is performed.

## Validation and files

New session-recovery.test.mjs63 synthetic cases: expiry boundaries/password/status/link/epoch revocation, concurrent disable during lookup, inactive Person refusal/own return, independent/same-ID checkout/return CAS, direct lookup privacy/refusal/unknown, malformed ledger, unchanged backup/legacy state, session-vs-unrelated-cookie scope, bounded metadata/expiry/storage denial/tampering/logout/account isolation, client timeout/lost acknowledgement/reload/no-resubmit, late commit after unknown and invalid confirmation refusal. Existing28 suites, including81 Person-link cases, remain regression gates; total29 suites. Final local and exact Linux evidence are recorded in PROGRESS after checks/publication.

Optional browser command: node tests/session-recovery-browser.mjs .qa/browser/node_modules/playwright "PATH_TO_EDGE". Actual built Worker/auth cookies, synthetic in-memory SQLite, separate Admin/User and multiple User tabs, Edge desktop1280/mobile360/390; external requests blocked. Covers explicit Person linking, double submit, lost response/15-second timeout, refresh and read-only recovery, lookup network failure, multi-tab checkout/return CAS, inactive Person return/new-checkout denial, unknown outcome, logout scrub/relogin/account isolation and expired-session Thai UX. No physical mobile, real TLS/identity or Cloudflare behavior is verified.

Changed runtime: api.ts, worker.ts, trip-operation.ts, trip-submit.ts, trip-recovery.ts (new), App.tsx, JourneyForm.tsx, EmployeeDashboard.tsx. Tests: session-recovery.test.mjs and session-recovery-browser.mjs (new); package.json adds the suite. Docs: this guide, PROGRESS, ROADMAP, TEST_PLAN, ARCHITECTURE and VERIFIED_PERSON_LINKING.

Next proposed task: owner-reviewed design for manual unknown-operation reconciliation and accessible support UX, without adding an abandon/reset button or data-changing endpoint automatically. Native-device/cross-browser acceptance remains a separate gap. Operator/Live/Initialize/Deployment stay DEFERRED. No Cloudflare API/credentials/real D1, Production/Demo resources, R2/Cron/public URL, migration, Initialize/Deploy/Merge was used or changed.
