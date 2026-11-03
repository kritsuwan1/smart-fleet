# Task 3C.2N — Operator approval and authenticated transport (OFFLINE ONLY)

Task 3C.2O architecture decision proposal: [LIVE_SECURITY_ARCHITECTURE_REVIEW.md](LIVE_SECURITY_ARCHITECTURE_REVIEW.md) recommends an operator-run one-shot verifier on an agent-isolated trusted endpoint (A) for occasional checks. A permanent signed-approval broker (B), live key enrollment and distributed replay machinery are conditional on delegated approval requirements, not automatic prerequisites for A. This supersedes the universal future-broker requirements below at design level only. N's code/signatures/stores remain strictly offline, not a live authorization; no alternative live implementation is approved or added. Owner architecture/isolation/scope decisions remain pending.


2026-11-02, dev/smartfleet-batch-1. **Offline cryptographic approval/replay/transport tests PASS; actual operator enrollment, credential bridge, TLS and Cloudflare API NOT_VERIFIED. Live mode and initialization NOT_READY.** No real signer/Cloudflare credential was created, read or used. No live transport, token loader or live CLI was added. Task M broker's live denial is unchanged; the new facade also rejects every mode except offline before approval processing.

## Implemented boundary

- scripts/d1-offline-security.mjs: fixed-domain Ed25519 verification against an independently supplied public trust registry, exact signed payload, scoped in-process grants, persistent one-use nonce claim and strict evidence integrity/storage helpers. No signing or private-key loading API exists in runtime code.
- scripts/d1-approved-offline-transport.mjs: verifies/claims approval before any Mock metadata call, checks authority scope/config/policy, consumes signed request budget before each request, and delegates only to Task M's built-in Mock broker. No external transport/fetch/auth/header hook is accepted. GET Account → GET selected D1 → POST schema → conditional POST fleet_store count remain the only sequence. No protected-table content, write, initialization or deployment operation is exposed.
- tests/d1-offline-security.test.mjs: 64 new cases included in npm test (21 suites total), including real signature mathematics over **public RFC test vectors**, not actual operator credentials.

Account stays 8853419a19293131998afe07ee651e62. Staging and Recovery keep their exact separate names/UUIDs/bindings from the existing policy. No tuple, schema or SQL Allowlist is expanded.

## Approval format and actual authenticity checks

The runtime supports Ed25519 public SPKI only, with no caller-controlled algorithm. Signature input is the fixed domain SmartFleet-D1-OFFLINE-Approval-v1 followed by a zero byte and a JSON array of fixed ordered fields. Field order is defined in offlineApprovalBytes; arbitrary/missing fields and caller-supplied public keys in an envelope are rejected. This is a narrow format, not a general JSON/JWS implementation. References: [Node 24 crypto verification](https://nodejs.org/docs/latest-v24.x/api/crypto.html#cryptoverifyalgorithm-data-key-signature-callback) and [RFC 8032](https://www.rfc-editor.org/rfc/rfc8032.html).

Signed fields: version, purpose=offline-readonly-rehearsal, approvalId (128-bit public nonce), operatorId, keyId, target, accountId, databaseId, binding, configSha256, policySha256, sourceCommit, issuedAt, notBefore, expiresAt and requestBudget (1–4). Lifetime is at most five minutes; anchor validity can shorten it, and Mock broker additionally caps the attempt at 60 seconds. Expiry/clock rollback and budget are checked before every request; expiry is checked again after nonce persistence and at completion. No nonce refund/retry occurs on any failure.

A signature is accepted only against an enabled public anchor with the registered operator/key IDs, allowed target and valid dates. Envelope-provided identity/key fields do not define trust. Unknown/revoked/wrong keys/operators, copied grants, forged signatures, modified scope/time/budget, future/expired approvals and cross-target/config/policy/source claims fail closed. The registry is copied at authority construction; incoming JSON cannot add a key to that registry.

**Trust boundary:** createOfflineApprovalAuthority is a trusted bootstrap API, not an untrusted client request handler. Its public registry and expected source/config/policy must be provided by the operator-controlled verifier process, not the caller who submits an approval. A caller controlling bootstrap or the same Node process could trust their own key or modify code. This implementation cannot certify a human operator from an arbitrary public key. Default trust registry is empty and accepts no signer. No actual operator/public key was enrolled in this task; operatorEnrollment stays NOT_VERIFIED even after a test signature passes.

For future real enrollment: independently identify the operator and bind the public-key fingerprint to that person/role through an approved out-of-band process; protect the registry from approval submitters, establish revocation/rotation and enforce source/policy attestation. The signer must display the exact target/account/UUID/hashes/expiry/budget and require operator authentication/user presence. Private signing material remains exclusively in that operator's managed process/device, never with the agent. These are design requirements, not executed credential operations.

## Replay and budget enforcement

After signature, scope and time validation, a nonce digest is atomically claimed with exclusive file creation in .qa/d1-offline-security/approval-ledger. The file contains only a fixed offline marker, not a signature, key, header or full approval. File content is flushed before returning a grant. A failed/expired-after-claim attempt still consumes the nonce. Only after the claim does the verifier issue a private WeakMap-bound grant; copied/JSON-forged grants cannot consume it. There is no runtime release/reset API.

The signed budget is debited before delegating requests to the independent Mock request validator. Invalid URL/method/headers/SQL, network/permission/schema failures and exhausted/expired grants close the transport; there is no retry/retarget. A new process/authority cannot reuse the same claimed nonce on the same ledger, including for a separately signed cross-target attempt. A test runs two separate Node processes concurrently and confirms exactly one accepts a valid approval. Child environments are empty; no credential inheritance is required by the test.

This is normal-process file-backed replay protection, not a claim of tamper-proof distributed storage. A hostile owner could delete/roll back the directory, change code, restore a snapshot or use a different checkout. Directory durability through power loss, Windows ACLs, OneDrive synchronization, host clock integrity, cross-host coordination and live revocation refresh are NOT_VERIFIED. A future live service needs one protected transactional/append-only nonce store across all approvers/targets, trusted time/registry management and authenticated administrative controls. Test teardown removes only its own synthetic fixture claims; runtime has no such release operation.

## Authenticated network transport design — blocked, not implemented live

The implemented transport authenticates **offline approval signatures** and returns only Mock responses. It does not authenticate to Cloudflare. Neither signed approval nor a mode/config/environment flag can enable network traffic. No real key registry, Authorization header, HTTP client, proxy or credential store is opened. No CLI accepts a signed artifact to connect live.

Future trusted architecture, requiring a separate approved implementation/review:

1. An isolated operator-owned verifier loads the approved public registry/source policy and verifies a target-specific signed approval. It must not accept keys, source attestations or filesystem locations from an untrusted approval caller.
2. It claims the nonce in protected persistent storage before releasing any request authority, then checks scope/expiry/revocation/budget on each request. Staging/Recovery use distinct approvals and nonces, never one multi-target grant. Offline signatures/test roots/purpose must be rejected by a future live protocol using a separate domain/trust policy.
3. A separate operator-controlled credential bridge uses an already approved read-only authentication mechanism; the credential stays inside that process. Header injection occurs only there and is never returned, logged, persisted in evidence or made available to the agent. Actual credential setup/use/permission inspection is not authorized by Task N.
4. The egress boundary independently enforces the exact HTTPS host/account/UUID/path/method/body and sequence from Task L/M, refusing all arbitrary caller headers/URLs/SQL/proxies/dispatchers. Normal certificate/hostname/CA verification must stay enabled. No insecure TLS override, transparent proxy retarget, redirect, fallback account or retry is allowed. DNS/CDN behavior must not weaken hostname verification.
5. A hard request deadline and AbortSignal must close/cancel real I/O; approvals are rechecked after responses. HTTP 401/403, timeout, abort, TLS/DNS/redirect/identity/query/schema failure closes the attempt without revealing headers/provider error text. Mock HTTP-scheme/redirect/abort tests are not real TLS, proxy or cancellation certification.
6. Return only approved identity/schema/count evidence to the caller; keep protected-table/Fleet/credential data inaccessible. A separately controlled evidence collector should pin the captured artifact hash or sign/append an audit receipt. Signing approval authorizes an attempt; it does not attest that API results occurred.

Real authentication/TLS cannot be certified safely in this offline task; the above is the required design and blocker list, not a ready authenticated HTTP implementation. Do not remove mode guards or enroll the RFC fixture key as an operational workaround. Agent Lee Access and Cloudflare resources/permissions are not created or changed here.

## Evidence integrity and storage

Offline evidence contains only exact allowed fields: offline/synthetic/NOT_VERIFIED flags, scope, approved operator/public-key fingerprint, approval/nonce digests, request budget/effective expiry, redacted Mock metadata/schema/counts, safe request stages/status and timestamps. No full approval signature, private key, Token/Authorization/Cookie, provider error body or arbitrary input literal is retained. Unknown fields/definitions/metadata and secret/header-shaped additions are refused by the evidence serializer. The broker preserves only a digest/count on unknown schema.

Artifacts wrap the payload with a deterministic JSON payload digest. verifyOfflineEvidence also requires a **separately trusted SHA-256 of the complete file**; a self-reported embedded checksum is insufficient. Tests tamper with evidence and confirm refusal against the pinned file hash. These hashes detect mismatch against a trusted reference, not authenticity against an attacker who controls both artifact and expected hash. Approval verification does not sign execution evidence; actual live provenance remains NOT_VERIFIED.

Files are restricted to .qa/d1-offline-security/sealed-evidence with generated names, exclusive creation and file flush. Parent symlinks/non-directories are refused; owner-only directory/file modes are requested. No arbitrary output path, overwrite or ledger content is accepted. Windows ACLs/encryption/backups/sync/hostile-filesystem races are not certified; future live storage must be approved and isolated from untrusted writers and synchronized/public folders. Git ignore is not privacy or immutability. Stored mock artifacts are ignored, not committed.

## Offline testing / use

```text
node tests/d1-offline-security.test.mjs
node tests/d1-broker.test.mjs
npm run build
npm run typecheck
npm test
```

There is intentionally no production signing command, key generation, token setup or live execution command. The new test fixture imports only published RFC 8032 section 7.1 test-vector material to produce deterministic synthetic signatures; no real credential or new secret key is generated/read. Runtime code contains no signer/private-key loader. Never enroll these public test vectors for real approval. Tests are examples of interface behavior, not a procedure to authenticate a real person.

Actual Windows x64 Node v24.22.1: Build PASS (Demo 997247 / Production 995873 / Staging 996020 bytes), Typecheck PASS, npm test PASS all 21 suites. New suite: 64 cases covering trusted/unknown/revoked/wrong key, forgery, scope/config/policy/source mutation, canonical field order, expiry/clock rollback/post-claim expiry, budget, copied grants, concurrent cross-process replay, cross-target reuse, redacted sealed evidence, external hash tampering, HTTP/URL/abort/proxy/credential-option/live denial and Mock transport failures. Global fetch tripwire remains zero. Existing broker 75/adapter 48/reserved 61/initialization 28 tests also PASS. Linux exact-commit evidence is recorded after publication in PROGRESS.md.

## Required approvals / remaining blockers before live

| Gate | Current status | Needed next |
| --- | --- | --- |
| Offline signature/replay/Mock transport | PASS | Review the published implementation/tests |
| Real operator identity/key enrollment | NOT_VERIFIED | Out-of-band identity/fingerprint/role verification; protected public registry, signing/user-presence and revocation process |
| Actual credential bridge and read-only permissions | DESIGN ONLY | Operator-owned mechanism, scope/permission review and separate implementation approval; no credential values to agent |
| TLS/timeout/abort/proxy isolation on actual network | NOT_VERIFIED | Review/implement isolated egress and explicitly approved live tests |
| Replay/evidence store and source/time attestation | NOT_CERTIFIED_FOR_LIVE | Protected transactional persistent store, private ACL-reviewed evidence collector, trusted code/clock/registry controls |
| Staging read-only attempt | NOT_APPROVED / NOT_RUN | Separate signed target/account/UUID/config/policy/source/expiry/budget approval after the above gates |
| Recovery read-only attempt | NOT_APPROVED / NOT_RUN | Independent signed approval/nonce and separate evidence; never inherit Staging authority |

No actual Cloudflare identity/schema is verified by these tests. Initialization, real SQL writes, deployment, resources, Production/Demo, R2/Cron/routes and main merge remain unapproved and untouched. Offline task complete for review; live remains NOT_READY.
