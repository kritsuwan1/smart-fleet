# Task 3C.2M — Safe read-only broker (MOCK ONLY)

2026-11-02, dev/smartfleet-batch-1. **Implementation/rehearsal PASS; live Cloudflare NOT_VERIFIED; live execution and initialization NOT_READY.** Default mode is mock. All other modes, including live with an approval object, are rejected. No code path, credential loader or network client exists to enable live operation in this implementation.

## Components

- scripts/d1-readonly-broker.mjs: independent request/response policy, built-in synthetic responses, single-attempt state machine, optional mock-manifest validation, safe evidence snapshots/persistence.
- scripts/rehearse-d1-readonly.mjs: offline CLI for one explicit target; no live/auth/token/environment flags. Reads only the known example Config and writes synthetic evidence under ignored .qa/d1-evidence.
- tests/d1-broker.test.mjs: 75 cases included in npm test (20 suites total). Existing adapter/planner tests remain included.
- d1-initialization-safety.mjs exports the existing pure schema validator so broker and planner share the same exact-object policy. This helper issues no provider proof or initialization authorization. No Account/DB tuple or reserved-schema exception was added.

Approved account is 8853419a19293131998afe07ee651e62. One broker is permanently bound to either Staging (DEMO_DB, f71ba325-027c-4b3f-abb2-71492493a8cf, smart-fleet-staging-db) or Recovery (RECOVERY_DB, 5ec99f9c-4919-41f4-9bc4-c8c564a60296, smart-fleet-recovery-db). Config is copied and validated before use. No Production/Demo target exists.

## Actual offline usage

From the repository root, Node 24:

```text
node scripts/rehearse-d1-readonly.mjs staging
node scripts/rehearse-d1-readonly.mjs recovery
node tests/d1-broker.test.mjs
```

Each rehearsal creates a separate mock-target-randomUUID.json evidence artifact and prints only mode/target/status/liveVerification/path/file SHA-256. These commands never connect to Cloudflare and never initialize a database. Both target rehearsals were actually executed successfully in Task M. Artifacts are ignored, not committed. No image/API/live evidence is fabricated from these responses.

For failure simulation via the module:

```js
import {createD1ReadonlyBroker} from './scripts/d1-readonly-broker.mjs';
const broker = createD1ReadonlyBroker({
  target: 'staging', config: reviewedStagingConfig,
  scenario: 'schema-mismatch' // default is reserved; all fixtures are synthetic
});
try { await broker.run(); } catch { /* safe refusal; never retry automatically */ }
const safeSnapshot = broker.getEvidence();
const artifact = await broker.saveEvidence();
```

No arbitrary transport/fetch function, URL, headers, credential source or token option is accepted by the factory. Built-in scenarios cover empty/reserved/empty-fleet/occupied schema, HTTP 401/403 at stages, network failure, wrong account/UUID/name, unexpected schema, query failure, redirects, invalid JSON, write metadata and malformed count. These are JSON fixtures; no _cf_KV table is created, queried, counted or changed.

## Request and response enforcement

The broker transport is independently guarded even when called outside run():

1. Exact string URL match to https://api.cloudflare.com/client/v4/accounts/{approved-account}, that target's /d1/database/{uuid}, then its /query. Wrong scheme/host/account/UUID, userinfo, query strings, fragments, path tricks and retargeting are refused without producing a response. No external request is sent even for a valid URL: responses are constructed in memory.
2. Mandatory sequence account GET → database GET → schema POST → conditional fleet_store-count POST. Only Content-Type: application/json is accepted. Header names are checked before values; Authorization/Cookie/custom headers and extra request options are refused and never logged. GET bodies are forbidden. POST accepts exactly {sql,params:[]} and one of the existing fixed SELECTs in the correct stage, not arbitrary read/write SQL or PRAGMA.
3. Metadata ID/name must match before advancing. Schema uses the shared K exact _cf_KV/fleet_store rule; unknown objects fail closed. COUNT occurs only for accepted fleet_store and must return zero. No protected-table count or value read is permitted. HTTP/JSON/query failures and suspicious rows_written/changed_db responses stop the attempt.
4. redirect:error and a non-aborted AbortSignal are mandatory; abort before/during response validation, concurrency, budget exhaustion, replay and stale/clock-rollback evidence are refused. Default attempt lifetime is 60 seconds; maximum four constructed responses. No transparent retry, alternate target or fallback endpoint. Actual network timing/TLS is not exercised by mocks.
5. Integrated run() invokes the existing adapter/planner, so its metadata capability and schema rules are also checked. It discards the planner's in-memory initialization plan and emits evidence only. No SQL executor or deployment operation is exposed.

run() is one-shot. A failed operation closes transport. getEvidence() returns a copy; caller changes do not alter broker state. A fresh snapshot includes whether evidence is still within the mock attempt window. Saved-file freshness is historical at capture time, not continuing approval or a durable lock.

## Approval behavior and future live gate

Mock rehearsal needs no live permission. An optional **mock-only**, unsigned approval manifest can rehearse scope enforcement. describeMockBrokerPolicy(target,config) supplies the exact config/policy digests for its target. The accepted manifest fields are mode=mock, target, accountId, databaseId, configSha256, policySha256, issuedAt/expiresAt (epoch milliseconds), and requestBudget (1–4). It must match the fixed tuple/digests, be current and have at most a five-minute window; the broker still caps its attempt at 60 seconds. Scope/expiry/budget are rechecked before responses. Wrong or expired manifests fail; approval input is copied and never used as credentials.

This validates a mock manifest's shape/scope only. It is **not** authenticated operator approval, signed authorization, a cross-process replay registry or evidence of permission on Cloudflare. The same manifest could be copied into another mock process. Neither a manifest nor an environment variable, injected function, Config edit or mode flag can activate live mode. A new reviewed implementation is required before any live transport can exist; do not patch the mode guard as an operational workaround.

Before a future live read-only task, request the following independently for **Staging**, then **Recovery**:

1. Review/approve the exact future source, broker isolation and trusted authentication mechanism/resource permissions owned by the operator. No credential value should reach the agent. Agent Lee Access, credential creation/read or broader permissions are not implied. The present implementation does not authenticate to anything.
2. Implement/review authenticated operator approval verification, bounded manifests with source/config/policy hashes, target/time/request budget, identity/schema stop rules and cross-attempt replay control. The mock JSON checker is not a substitute for that gate.
3. Explicitly approve each target's two metadata GETs plus schema POST and conditional count POST; authorize at most four requests, no retry/retarget. Approve safe private evidence storage. Staging approval must not authorize Recovery or any Production/Demo request.
4. Validate real HTTPS/TLS/redirect/abort/proxy isolation and actual read permissions in the separately authorized live exercise. D1 Read/Account Settings Read and per-account credential scope remain subjects of the Task L runbook; no credential is created/inspected here.
5. Reconcile real API results with the separate Dashboard record and record actual timestamps/source. Stop after read-only evidence. Initialization/write/deploy/resource/R2/Cron/route actions remain separate and unapproved even after a live PASS.

See LIVE_D1_VERIFICATION_PREPARATION.md for endpoint/permission references and approval sequence. No live command is provided because no live mode exists; the commands above are the working rehearsal interface only.

## Evidence and redaction

Evidence always contains mode=mock, synthetic=true and liveVerification=NOT_VERIFIED, plus target/expected tuple, mockMetadata, timestamps (UTC and Asia/Bangkok display), policy/config digests, safe request stages/methods/status and final PASS/REFUSED reason. Known accepted schema objects retain only reviewed canonical definitions and DDL digests. Unexpected schema records only count/digest/refusal, not arbitrary literals. Missing fleet_store count is null, never an invented zero.

Request URLs supplied by callers, headers, auth material, raw response/error text, unknown DDL literals, Fleet payloads and session/secret values are not persisted. Tests include confidential sentinel strings in fake errors/invalid inputs and assert their absence from evidence. getEvidence() is safe-copy output, not the raw mock HTTP response.

saveEvidence() permits only a generated filename in repository .qa/d1-evidence, resolves parent locations inside the repository, uses exclusive file creation (no overwrite), requests owner-only mode and returns the exact saved-file SHA-256. No caller-supplied path or arbitrary file operation is exposed. Windows ACLs, OneDrive synchronization and resistance to a hostile concurrent filesystem are not certified. Git ignore and a checksum do not by themselves make storage private, encrypted, immutable or authentic. Evidence uses synthetic metadata only in this task; future live storage must receive operator review separately. No credentials should ever be supplied in Config or manifest fields.

## Tests and security limitations

Broker suite: 75 cases covering both targets/success variants, live-mode denial even with approval, forbidden transport/credential options, invalid target/config, permission/network/identity/schema failures, redaction, URL/method/header/SQL refusal, order, abort/concurrency, source Config mutation, manifest mismatch/expiry/budget, evidence expiration/replay, isolated file persistence/hash and overwrite refusal. Global fetch is replaced with a failing tripwire; the suite asserts zero calls. The module has no network client or arbitrary callback hook. This does not sandbox malicious JavaScript in the same process or attest a future authenticated transport.

Actual Windows x64 Node v24.22.1: Build PASS (Demo 997247 / Production 995873 / Staging 996020 bytes), Typecheck PASS, all 20 suites PASS. Existing adapter 48, reserved-schema 61 and initialization 28 fixtures still pass; no dependency/schema/SQL/config/Business Logic changes. Linux exact-commit results follow publication in PROGRESS.md.

Mock Broker implementation PASS. Live authentication/permission/identity/schema/TLS/actual network behavior NOT_VERIFIED; live mode and initialization NOT_READY. No Cloudflare API, credentials, Agent Lee Access, protected-table data, real SQL, resource/Production/Demo/R2/Cron/route changes, Initialize/Deploy/Merge occurred.
