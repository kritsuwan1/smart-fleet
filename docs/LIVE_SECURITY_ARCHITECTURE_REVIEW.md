# Task 3C.2O — Live security architecture review (DESIGN ONLY)

Date: 2026-11-03, Asia/Bangkok. Repository kritsuwan1/smart-fleet; branch dev/smartfleet-batch-1. Reviewed remote ff80d24994b5d4571584b90dd960fd476fef6853 and Task N executable commit f0c0109494e6ce4bfafa29b9081994f052262580. **Design review complete; recommendation awaiting owner decision. Real operator/auth/TLS/API NOT_VERIFIED; Live / Initialize / Deploy NOT_READY.**

No new security system, live transport, CLI, credential access, account API call or resource change is implemented/authorized here. Public documentation review is separate from authenticated API access. This document supersedes earlier L/N proposals that treat a permanent broker, signed approvals, distributed replay storage or repository .qa storage as universal live prerequisites. Their existing code remains offline-only and unchanged. A simpler route is a proposal requiring separate approval, not an operational bypass.

## Recommendation and alternatives

**Recommend A: a short-lived operator-run verifier on a trusted Windows workstation or VM isolated from the agent.** Start with a single operator, one target per process, no background service, inbound listener, agent RPC or unattended execution. Operator runs the reviewed packaged artifact manually, authenticates to the Windows session and confirms the displayed exact scope immediately before I/O. Credentials never enter the development checkout or agent session. A separate Windows account is the minimum only if the agent is non-admin and cannot access that session/process/storage; otherwise use a separate trusted device/VM with no agent, shared profile, clipboard or writable shared folders. These conditions have not been verified on the current machine.

| Decision axis | A. Operator-run local verification | B. Isolated broker with signed approvals |
| --- | --- | --- |
| Who initiates | Operator present, single local attempt | Delegated caller submits signed approval to separate trusted executor |
| Credential boundary | Protected operator session/device; fixed verifier owns secret access | Dedicated broker identity/device; authenticated IPC/API and service lifecycle |
| Human approval | Trusted session, registered operator identity and exact-scope confirmation; local receipt is an operational record | Independently enrolled Ed25519 public keys, signer user presence, protected registry and per-request authorization |
| Replay need | One-use attempt ID persisted before I/O; no importable approval/grant, resume or automatic retry | Persistent transactional nonce consumption across broker instances; no refund; revocation and anti-rollback controls |
| Maintenance burden | Small reviewed package, operator checklist, private local evidence | Key enrollment/rotation/revocation, signer UX, broker patching, IPC authentication, replay availability and audit collector |
| Useful when | Occasional SmartFleet Staging/Recovery checks by owner | Multiple approvers, remote delegation, frequent/unattended checks or external audit requirement |
| Residual risk | Trusted endpoint/operator can alter code, evidence or use broad account credential elsewhere | Broker/admin compromise remains; signatures do not protect a compromised executor |
| Recommendation | Preferred, subject to isolation/permission acceptance | Defer until a concrete delegation requirement justifies it |

A does **not** treat unsigned JSON as proof of operator identity. Its authority is an independently registered operator using a protected, authenticated interactive session and trusted local executable. A caller-provided name/manifest, chat message, environment flag or Windows username string is insufficient. If organizational policy requires non-repudiable remote approval or separation of approver/executor, A is insufficient: choose B or keep NOT_READY. Existing N signatures cannot be repurposed as live authorizations.

## Reviewed code and boundary findings

| Component / repository evidence | What works offline | Live implication |
| --- | --- | --- |
| scripts/d1-offline-security.mjs: offlineApprovalBytes / createOfflineApprovalAuthority | Fixed-domain Ed25519 public-key verification, exact scope/time/budget, private grants and empty default registry | Correct signature mathematics is not human identity. Registry is constructor-supplied; a caller controlling bootstrap can enroll themselves. sourceCommit is a bound claim, not executable attestation |
| Same module: accept / persistOfflineArtifact | Exclusive nonce claim + file flush before grant; expiry burns nonce; cross-process race tests | .qa is under this OneDrive checkout; mode bits do not certify Windows DACLs. File claims do not resist owner rollback/deletion or multiple checkout paths |
| Same module: evidence serializer / verifier | Restricted fields, payload digest plus externally pinned file hash | A hash proves agreement with a trusted reference, not Cloudflare provenance. Self-recomputed hashes cannot detect malicious replacement |
| scripts/d1-approved-offline-transport.mjs | Approved private authority and target/hash checks before Mock metadata; budget/expiry before each call | No authenticated HTTP implementation. No real operator, token loader, TLS, proxy or I/O cancellation guarantee |
| scripts/d1-readonly-broker.mjs | Built-in synthetic responses; fixed URL/method/SQL/order; fails closed; rejects live | Reuse pure request/schema rules by review, not its mock-response generator or live guard removal |
| scripts/d1-provider-identity.mjs / d1-readonly-adapter.mjs | Exact metadata comparison and short-lived target-bound capability | Injected responses must come from a trusted real transport. WeakMap capability authenticates process origin/freshness only, not the network |

No vulnerability in signature mathematics was demonstrated by this review. The principal blockers are trust bootstrap, execution isolation, credential scope and genuine HTTPS implementation, not a need for more cryptographic wrappers. Keep all N tests/modules as offline regression evidence. Do not enroll RFC fixture keys, patch mode guards or convert mock PASS flags into live evidence.

## Windows threat model

Assets: operator-owned credential, approved account/DB scope, reviewed executable/config/policy, approval identity, evidence and one-use attempt state. The account may also contain Production/Demo; read-only credentials can still expose sensitive data if used outside the fixed request boundary.

| Threat / severity | Required control for A | Remaining limit |
| --- | --- | --- |
| Same-user agent, injected module or malicious dependency steals secret / HIGH | Run outside agent identity/device; deploy only reviewed fixed artifact; no npm install/scripts in credential-bearing session; no inherited debug/preload/loader options | Merely closing the app or using another folder is not isolation. Same user can access user-scoped protected secrets |
| Admin/malware/compromised OS / HIGH | Trusted maintained endpoint, non-admin daily execution, operator-controlled release installation | Local admin/OS compromise is outside this verifier's guarantees; stop if suspected |
| Config/registry/artifact swapped after review / HIGH | Protected non-sync installation, manifest of exact artifact/config/policy digests, load validated immutable snapshot once; abort on mismatch | Git branch name/sourceCommit string alone does not attest loaded bytes |
| Broad D1 Read reaches Production elsewhere / HIGH | Exact account/UUID/method/SQL transport policy; operator privately verifies permission/resource summary | Account-scoped credential may still reach other databases outside this tool. Requires owner risk acceptance or narrower enforceable isolation |
| Proxy, TLS interception, redirect or retarget / HIGH | Fixed HTTPS request construction, controlled CA/runtime, no inherited proxy/custom dispatcher, no redirects/retries | Hostname-valid enterprise TLS interception may be trusted by a managed CA; reject unless explicitly reviewed. No claim that URL allowlist prevents all hostile OS egress |
| OneDrive, junction, ACL inheritance, evidence/ledger overwrite / HIGH | Private non-sync directory with explicit reviewed DACL, no reparse paths/shared links, exclusive writes, immutable loaded inputs | Checks are not a defense against a hostile admin or filesystem races controlled by the same trusted owner |
| Replay, clock rollback, concurrent attempt / MEDIUM | One-shot process, exclusive active-attempt lock, durable unique attempt record, monotonic elapsed deadline plus UTC validity, burn failures | Local snapshot rollback is not prevented cryptographically; no cross-host/reusable approval support in A |
| Response/error/log secret leakage / HIGH | Parse bounded responses; persist only approved fields; generic errors; no raw headers/body, debug trace, keylog, dumps or token fingerprints | OS crash/dump/telemetry handling must be reviewed privately; JavaScript cannot promise complete memory erasure |
| Stale schema or writer race / HIGH | Timestamp each target; finish within freshness; no readiness inference for future writes | Read-only preflight is a point-in-time observation, not a DB lock or initialization approval |

[Microsoft DPAPI documentation](https://learn.microsoft.com/en-us/windows/win32/api/dpapi/nf-dpapi-cryptprotectdata) describes protection normally tied to user logon and machine, with exceptions. Therefore user-scoped DPAPI storage is a candidate for at-rest protection, not isolation from other code running as that user. Do not use machine-wide protection as the operator boundary. No actual Windows accounts, ACLs, vaults, proxy settings or host credentials were inspected in this review.

## Operator identity, keys and revocation

For A, maintain a small owner-approved **public operator register** outside the caller-controlled checkout: operator reference, independently confirmed person/role, Windows principal SID, allowed target(s), validity, disabled status, enrollment/reviewer reference and register revision/hash. Verify the actual process security principal and operator presence, not a supplied SID/name. Owner confirms the mapping out of band; Windows authentication alone cannot establish the Cloudflare owner role. A self-entered operator name is only a label.

Before every attempt require an unlocked authenticated operator session and explicit scope confirmation; if unattended/remote execution or an untrusted trigger is possible, stop. Proposed short validity: start within five minutes, finish within 60 seconds, at most four requests. Registry/config/source are protected and immutable for that short process. Revocation disables the operator/target for subsequent attempts, which must reload the latest register; operator cancellation closes an active attempt. No automatic resumption. If immediate central revocation during an attempt is required, choose B rather than claiming a local frozen register provides it.

A has **no required signing key** because approval is not delegated or imported. Do not generate a real Ed25519 key merely to preserve N's complexity. N public-key format and tests remain offline unchanged.

If B is selected later: enroll public SPKI + SHA-256 fingerprint via independently authenticated out-of-band identity/role confirmation; register key ID, target, validity, revocation and approved register revision under a broker-controlled administrator. Signer and executor must not accept roots supplied by the caller. Operator alone controls signing material/user presence; no private-key setup is authorized now. Rotation requires new fingerprint confirmation; revoked/unknown keys and stale/unavailable register fail closed, including outstanding approvals. Separate live purpose/domain/trust roots must reject N offline signatures and RFC fixtures. Use N's scope fields (including exact artifact/config/policy hashes, target/account/UUID, expiry, nonce and budget), plus a protected shared transaction for consume-once before network. A broker on the same unprotected Windows identity is not architecture B.

## Credential storage and least privilege

Proposal only: operator-owned approved vault or Windows user-scoped DPAPI-backed store on the isolated endpoint, addressed by fixed local non-secret entry reference. No plaintext file in the repository, .env, CLI argument, clipboard, shell history, global environment change or credential returned to agent/approval caller. Retrieve only after local approval and all offline checks; scope any in-memory use to that one attempt, release references at exit without promising memory zeroization. Do not run builds/npm hooks in that process.

Public Cloudflare references checked 2026-11-03:
- [Account Details](https://developers.cloudflare.com/api/resources/accounts/methods/get/) documents Account Settings Read among accepted permissions.
- [D1 metadata](https://developers.cloudflare.com/api/resources/d1/subresources/database/methods/get/) and [D1 Query](https://developers.cloudflare.com/api/resources/d1/subresources/database/methods/query/) accept D1 Read. Select-bearing POST does not require proposing D1 Write.
- [Token resource scoping guidance](https://developers.cloudflare.com/fundamentals/api/get-started/create-token/) explains selecting permissions/resources and optional IP/time restrictions. Actual operator auth mechanism/permission/resource scope has not been inspected.

Propose only Account Settings Read + D1 Read on the approved account, no Global API key, D1 Write, Workers/R2/secret/token-management access. Operator must privately verify the real permission summary and whether database-level resource scoping is available for the chosen mechanism; this review does not establish per-UUID token isolation. Never claim “D1 Read” means schema-only: it can authorize other reads. If it spans an account containing Production, credentials and host remain trusted high-risk assets even with application allowlists. Owner must accept that residual risk or choose a demonstrably narrower boundary; otherwise NOT_READY. On 401/403 stop; do not widen permissions or fall back. No secret value is requested, created, read or shown here.

## Fixed requests and network policy

Account is exactly 8853419a19293131998afe07ee651e62. Use one target per fresh process; no combined approval:

| Target | Database name / UUID | Binding / config |
| --- | --- | --- |
| Staging | smart-fleet-staging-db / f71ba325-027c-4b3f-abb2-71492493a8cf | DEMO_DB / config/staging-no-r2.example.jsonc |
| Recovery | smart-fleet-recovery-db / 5ec99f9c-4919-41f4-9bc4-c8c564a60296 | RECOVERY_DB / config/recovery-d1.example.jsonc |

Construct URLs internally from those constants. Exact origin https://api.cloudflare.com:443; no URL userinfo, fragments, extra ports/queries, encoded alternate path, arbitrary host/path/headers/SQL/agent/dispatcher. Paths, in order:
1. GET /client/v4/accounts/{approved-account}
2. GET /client/v4/accounts/{approved-account}/d1/database/{selected-UUID}
3. POST that exact D1 path + /query, body one fixed schema SELECT with params=[]
4. Only if exact fleet_store schema exists: POST same /query, body fixed COUNT with params=[]

The literal SQL policy stays unchanged:

```sql
SELECT type,name,tbl_name,sql FROM sqlite_schema WHERE name NOT GLOB 'sqlite_*' ORDER BY type,name
SELECT COUNT(*) AS row_count FROM fleet_store
```

Maximum four outbound attempts, serial, no transparent retry, refresh, redirect or alternate target/account. Count is not sent for absent fleet_store; actual null/not-queried is retained. No batch/multi-statement/user query/PRAGMA expansion, fleet payload, _cf_KV key/value/count, Worker/deploy/token/listing endpoint. A populated fleet_store yields REFUSED_FOR_INITIALIZATION, not data deletion/repair. Exact reserved-DDL/unknown-object policy remains unchanged.

Proposed trusted HTTPS implementation: use a fixed audited Node 24 runtime and one small internally configured client, with normal certificate-chain, validity and exact hostname/SNI verification; minimum TLS 1.2, no insecure override or caller TLS/CA/custom DNS callback. Validate peer chain normally rather than pinning short-lived Cloudflare CDN IPs/certificates. TLS authenticity relies on the reviewed trust store/endpoint; it is not an independent provider signature.

Use an allowlisted clean launcher environment, reject unreviewed NODE_OPTIONS/preload/inspect, proxy, extra-CA/trust overrides and TLS-disable settings before retrieving secrets. No need for the agent to inspect their values now. A future launcher must detect/refuse unsafe names/settings privately without logging values. [Node 24 CLI](https://nodejs.org/download/release/v24.20.0/docs/api/cli.html) documents proxy/CA/runtime controls; [HTTPS options](https://nodejs.org/download/release/v24.20.0/docs/api/https.html) describe TLS-related client options. Choose a direct client explicitly, not a generic inherited proxy dispatcher. If the network requires a proxy or enterprise interception, stop for a separate network design decision; no automatic proxy bypass/retarget.

A **hard 15-second total deadline per request**, including DNS/connect/TLS/headers/body, must destroy/abort real I/O; a socket inactivity timer alone is insufficient. Overall attempt at most 60 seconds including evidence finalization, additionally bounded by approval UTC expiry. Reject 3xx without following, validate response URL/status/envelope, limit headers and complete body (proposed 1 MiB maximum), no decompression beyond that bound, check cancel/expiry/identity before next step and again on completion. Any timeout, abort, malformed/oversize result, suspicious write metadata, identity/schema mismatch or evidence-save failure terminates the attempt with safe category only. Do not retry even if the request may have reached Cloudflare. Mock failure tests cannot certify these real transport properties.

DNS/endpoint/egress policy must never silently broaden when resolution or TLS fails. Do not implement static CDN IP pinning as a substitute for TLS. Separate host controls may restrict egress to the approved service; their setup needs operator approval. If OS/proxy/DNS compromise is inside the required threat boundary and cannot be controlled, neither A nor same-host B is ready.

## Private evidence and attempt state

Proposed location on the isolated operator profile: **%LOCALAPPDATA%\SmartFleet\D1ReadOnly\** with separate Install/Registry/Attempts/Evidence areas and per-target subdirectories. This is a location proposal, not a guarantee: operator must verify its resolved absolute path is outside Git/OneDrive/Dropbox/network shares, is not redirected/synced/reparse-linked, and has an explicit reviewed DACL limited to operator plus necessary trusted system administrators. Store no live artifacts in current .qa/OneDrive checkout. No such directory or ACL was created/inspected here.

For A use a small local durable append-only attempt journal or exclusive one-use attempt record plus global active-attempt lock on that one approved device; flush the pending record before credentials/network, mark terminal success/refusal afterward. Missing/corrupt state, lock contention, rollback suspicion or inability to flush/save means no next request/PASS. Burn failed/cancelled attempts, never delete/reuse their IDs to retry; a new operator confirmation is required. Runtime must not accept externally reusable approvals or alternative store paths. A local journal is not anti-admin/anti-snapshot or multi-host replay protection. Do not build distributed nonce infrastructure for A. For B, transactional cross-instance consumption and replay-store administration become mandatory.

Persist only approved operator/attempt reference, expected tuple separately from observed API identity, exact artifact/config/policy digests, safe schema names/types/DDL digests, count/null if queried, UTC timestamps plus Bangkok display, safe stage/status/refusal and explicitly mode=live/synthetic=false **only after actual authenticated I/O**. No headers, token fingerprints, cookies, key/value/Fleet payload, raw provider errors or arbitrary DDL literals. Unexpected schema may contain sensitive identifiers: keep only approved diagnostic count/digest and refusal outside the private operator session. Use existing redaction rules, bounded parse and exclusive no-overwrite evidence file.

Hash the finalized redacted artifact; privately retain its digest and attempt receipt in a separately controlled operator audit record or approved private audit system. A separate trusted reference detects later mismatch; a copied hash beside the file is not provenance. A's receipt is operator-attested process evidence, not cryptographic proof that Cloudflare returned it. If independently verifiable execution attestation/immutability is required, approve B plus an external protected collector rather than invent it locally. Proposed minimal retention: 30 days for redacted evidence, attempt IDs retained for the supported verifier lifetime; owner must approve retention, secure backup/access and disposal before live. No secret may enter evidence.

## Separate operator approval workflow (not executed)

1. Owner decides A/B, trusted endpoint, operator register, credential scope residual risk and evidence policy. A task to implement/test offline must be approved separately; no new system follows automatically from this document.
2. Before any future live task, review exact packaged bytes/config/policy and passing Windows/Linux tests, private endpoint isolation/ACL/credential permission summary and offline adversarial transport tests. Freeze one release and hashes, not a moving branch name.
3. Operator opens a trusted session outside the agent and sees a **Staging-only** confirmation: name, account, UUID, binding, source + packaged artifact/config/policy hashes, exact two GETs/schema POST/conditional count POST, 4-attempt budget, five-minute start/60-second finish limits, private evidence destination and “no writes/initialize/deploy”. Approve now or cancel; approval occurs before adapter construction because construction reads metadata.
4. Record registered principal/operator, explicit confirmation reference, unique attempt ID and UTC approval/expiry in private store. A cannot accept a caller-generated manifest as authorization. B instead requires the reviewed live signed protocol; N signatures remain invalid. Only then may operator-owned approved transport access auth material and run one serial attempt.
5. Close Staging, verify saved evidence against trusted digest, compare target-linked Dashboard findings and safely share only redacted report. On failure do not proceed or reuse the approval.
6. Obtain an independent **Recovery-only** approval, new process/attempt ID and its own exact config/UUID/binding/hashes/evidence. Repeat the gates; do not inherit Staging's grant, capability, credential scope assumption or observation.
7. Stop after independent read-only reports. No result authorizes initialization/SQL writes, deployment/resources, Production/Demo, R2/Cron/routes. Future initialization needs fresh immediate preflight, writer isolation and separate approval.

No live invocation command is supplied: there is no implemented/approved live verifier. The only runnable existing CLIs remain Mock/offline.

## Minimal implementation plan and acceptance gates

| Phase (future separately approved work) | Deliverable | Acceptance / stop condition |
| --- | --- | --- |
| O1 — architecture decision | Owner records A or B, threat boundary, operator/host/evidence owner and permission residual risk | Decline if trusted endpoint or account-wide credential exposure cannot be accepted |
| O2 — offline package | For A: small fixed-target one-shot runner, protected bootstrap/register checks, local approval UX, private journal/evidence; no generic broker/listener | Default offline; live not callable until separately reviewed operational release. No caller keys/URL/SQL/proxy/store path. N remains untouched offline |
| O3 — transport tests offline | Injected synthetic HTTPS failure harness; no real credential, no external network | Exact order/body, wrong tuple, redirects, 401/403, malformed/oversize body, TLS validation errors, timeout during every I/O stage, abort, proxy/loader/CA-option refusal, stale time, concurrent attempt, full disk/ACL/reparse/ledger corruption, evidence tamper/redaction tests PASS; no auth appears in diagnostics |
| O4 — operational private review | Operator independently verifies real host/runtime/release, SID/ACL/non-sync stores, auth scope and read permission summary | Agent receives no secrets. No credential setup/API call is implied; deficiencies require separate approval. Permission broadening prohibited |
| O5 — Staging read-only live approval | One target-specific authorized attempt, max four calls, safe evidence | Actual Account/D1/schema checks PASS or explicit refusal, no retry/write/secret spill. TLS/proxy/cancellation claims need explicitly authorized real-network validation; otherwise stay NOT_VERIFIED |
| O6 — Recovery approval | Separate attempt/evidence under same reviewed release | Same gates independently; no use of Staging result as Recovery evidence |

For B substitute isolated service/IPC authentication, real key enrollment/revocation and shared transactional replay tests at O2/O3. Do not develop both architectures concurrently.

Acceptance requires one-use operator confirmation, artifact/config/policy integrity, exact request allowlist, real provider response identity, unchanged strict schema policy, private evidence saved successfully, and honest per-target NOT_VERIFIED on any missing gate. Standard Build/Typecheck/all tests must pass on Windows and Linux for executable changes. Controlled offline TLS test doubles are not actual Cloudflare authentication verification; no unapproved public network test is permitted.

## Necessary controls versus avoidable complexity

| Retain for either route | Defer/avoid for current single-operator A |
| --- | --- |
| Trusted operator/executable boundary, private auth, read-only permissions, fixed account/target/SQL, true TLS, hard deadline/abort, fail-closed and safe evidence | Permanent daemon, generic proxy, remote agent access, multiple transports/auto-discovery |
| One target per explicit approval, 4-request budget, short expiry, one-use attempt and stop-on-first-failure | Ed25519 key lifecycle and remotely consumable signed manifests when operator and executor are the same trusted local actor |
| Current strict schema/count refusal and separate write authorization | Distributed ledger/consensus/central revocation service when there is only one short local process |
| Owner-reviewed non-sync DACL storage and independent hash receipt, honest provenance limits | Extra checksums/signing layers claiming stronger guarantees than the host/collector actually provides |

Reducing signature/broker infrastructure is a **design choice for A only**, not removal of existing guards or acceptance of untrusted approvals. Essential endpoint/credential boundaries are never simplified away.

## Review result, evidence and remaining decisions

- PASS — architecture/source and official reference review; A/B comparison, Windows threats, operator/credential/network/store policy, independent approvals and implementation acceptance plan documented.
- PASS — current Windows x64 Node v24.22.1 Build/Typecheck/all 21 suites, including 64 N security cases; no new tests/security code added for this document-only task. No lint script exists.
- Previous Linux baseline PASS — [run 41378250206](https://github.com/kritsuwan1/smart-fleet/actions/runs/41378250206), exact executable commit f0c0109, Ubuntu 24.04.5 / Node 24.22.1, 21 suites including 64 N cases; metadata rechecked completed/success during O. New O Linux run NOT_RUN: docs-only change excluded by existing paths-ignore, no executable changes. Not a new live/integration test.
- NOT_VERIFIED — actual operator/host isolation/ACL/vault/permission/transport/TLS/API identity/current schemas, independently for Staging and Recovery. Dashboard evidence remains user-reported 2026-11-01, not API verification.
- NOT_READY — Live / Initialize / Deploy. No actual live safety gate was passed by this design review.

Owner decisions needed: approve A versus B; identify trusted isolated endpoint and operator enrollment/revocation owner; accept or reject actual account-level credential scope after private review; approve non-sync evidence/journal protection/retention; authorize a bounded offline implementation task. After implementation/security acceptance, request a separate Staging live read-only attempt and later a separate Recovery attempt. Credential provisioning, real network access, initialization and deployment are not implicitly authorized.

Files changed by O are documentation only: this review; ARCHITECTURE.md, D1_OFFLINE_APPROVAL_TRANSPORT.md and LIVE_D1_VERIFICATION_PREPARATION.md cross-references; TEST_PLAN.md acceptance pointers; PROGRESS.md. No source/tests/dependencies/SQL/config/allowlists, live API/credentials/Agent Lee Access/Production/Demo/resources/R2/Cron/routes, Initialize/Deploy/Merge changes.
