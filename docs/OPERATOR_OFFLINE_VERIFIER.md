# Task 3C.2P — Operator-run one-shot verifier (OFFLINE ONLY)

2026-11-03, Asia/Bangkok; kritsuwan1/smart-fleet, dev/smartfleet-batch-1. Option A direction accepted for offline development, subject to final owner/host/credential/storage approval. **Offline implementation PASS; actual Operator/Auth/TLS/Cloudflare NOT_VERIFIED; Live / Initialize / Deploy NOT_READY.**

Read with [LIVE_SECURITY_ARCHITECTURE_REVIEW.md](LIVE_SECURITY_ARCHITECTURE_REVIEW.md). This implementation does not establish a trusted Windows operator or operational read-only connection. No signing keys, tokens, credentials, Windows operator directories/ACLs or Cloudflare resources were created/read. Task N signature system remains offline unchanged.

## Components and trust boundary

- scripts/d1-operator-offline.mjs: one-shot process guard, exact scope presentation/confirmation, private synthetic-fixture handles, pure Windows path/ACL model validator, in-memory attempt journal, internal synthetic HTTP/TLS boundary and strict evidence/hash verification.
- scripts/rehearse-operator-d1.mjs: interactive **synthetic rehearsal** CLI only. Requires exactly one target and --synthetic-rehearsal, input/output TTY, safe environment names and exact confirmation. Piped input, CI/unattended calls, multiple targets, --live and normal operational invocation are refused. No actual operator-bootstrap implementation exists.
- tests/d1-operator-offline.test.mjs: 133 cases, separate Node process per target/scenario, included in npm test (22 suites). Tests use no signing keys or credentials. Existing N public test-vector regressions are unchanged.
- package.json changes only the test command; lockfile/dependencies/application/business logic/SQL/config/policy are unchanged.

The public synthetic fixture factory deliberately models prerequisites in memory and labels its handles notOperatorAuthority=true. The verifier accepts only a handle recognized by a private WeakMap; copied JSON flags do not substitute. **Anyone calling the fixture factory is still simulating, not becoming a trusted operator.** There is no path to promote a fixture to live. A caller controlling the Node process can alter code; this module is not a sandbox for that caller.

Without the private synthetic handle, missing bootstrap, shared-host simulation, wrong principal or invalid storage causes refusal before confirmation or synthetic requests. Actual bootstrap/host/storage cannot currently be established by this implementation, so operational invocation stays refused. For the library, presentation/confirmation ordering is a simulation assertion; only the interactive CLI actually writes the scope before reading the answer. No interactive operator/human session was exercised by the agent.

## Scope, confirmation and one-shot behavior

One verifier creation attempt consumes the process slot even if refused. There is no reset or release. A second verifier/target attempt is rejected; Staging and Recovery require different processes. The reusable pure scope-description helper does not grant request authority.

The presentation displays offline/synthetic mode, target name, approved Account ID 8853419a19293131998afe07ee651e62, exact database name/UUID/binding, config/policy hashes, complete endpoint/method/SQL scope, conditional count and four-request maximum. Scope SHA-256 binds these displayed values. Confirmation must equal the complete REHEARSE + target + UUID + scope digest phrase; yes, a Recovery phrase or a phrase entered before presentation fails. This is typed consent to a simulation, not independent identity proof or a signed approval.

| Target | Database / UUID | Binding |
| --- | --- | --- |
| staging | smart-fleet-staging-db / f71ba325-027c-4b3f-abb2-71492493a8cf | DEMO_DB |
| recovery | smart-fleet-recovery-db / 5ec99f9c-4919-41f4-9bc4-c8c564a60296 | RECOVERY_DB |

Config is copied and validated using the existing strict target validator. No discovery/listing, Production or Demo target exists. Frozen process state, one-use run, five-minute confirmation window, UTC rollback checks and 60-second monotonic attempt bound are enforced. A pending synthetic attempt record is claimed before any simulated request. Failure/cancellation consumes the process; no retry, refund, retarget or resume. This journal is **memory-only**, not durable live replay protection.

## HTTP/TLS abstraction: synthetic only

The internal boundary delegates only to Task M's built-in Mock broker and existing read-only adapter. There is no injected HTTP/fetch/client/dispatcher/credential/header hook or network import. The interface shape is transport(url, request) internally, but it is not exported to callers. Only a finite synthetic scenario can select behavior.

The existing sequence remains two exact GETs for Account/D1 metadata, then exact schema SELECT POST, then conditional fleet_store COUNT POST if the exact accepted schema exists. At most four calls, serial, no retry/redirect/retarget. M independently validates each request and mock response; adapter/provider/planner retain exact identity, freshness and reserved-schema checks. No reserved-policy or SQL changes. No _cf_KV content/count, fleet payload, write, initialize or deploy operation exists.

Failure cases include redirect, permission, network, wrong Account/UUID/name, invalid response, unknown schema, nonempty fleet_store and suspicious write metadata. TLS certificate/hostname and DNS/connect/TLS/headers/body timeouts are simulated. A bounded Promise/AbortController boundary includes synthetic body consumption; timeout cases use a **5 ms synthetic timer**, abort the model and stop. Normal simulated deadline is 15 seconds; completion is bounded by the overall 60-second window. These scenarios prove fail-closed control flow, not actual TLS validation, socket destruction, proxy isolation or DNS/connect phase execution.

Proxy/dispatcher/auth/extra input options are not accepted. CLI inspects only environment variable **names**, not values, and refuses unsafe runtime/loader/proxy/CA/debug/keylog/coverage settings. Fixture tests simulate this check. No real environment settings are modified or values logged. A real launcher must be reviewed before any credential-bearing execution; checking after Node has started cannot undo an already-executed hostile preload. No claim of live host hardening is made.

## Storage model and future Windows design

No filesystem I/O is used by the module. It never opens/creates/inspects real operator storage or Windows ACLs. CLI reads only the selected repository example config and prints synthetic evidence. All new attempt/evidence work stays in memory.

The pure model validator rejects nonabsolute/UNC/network paths, noncanonical traversal, alternate streams, reserved DOS device names, trailing dots/spaces, excluded checkout/sync roots, OneDrive/Dropbox paths, mismatched expected/resolved root, reparse indication, inherited ACL, wrong owner/operator and unknown/broad ACEs. The finite synthetic model permits only its fictional operator SID plus SYSTEM/Administrators with explicit access. Model acceptance always reports actualAcl=NOT_VERIFIED. Supplied metadata cannot prove actual path ownership, non-sync status or DACL correctness.

Future location remains an operator-owned non-sync %LOCALAPPDATA%/SmartFleet/D1ReadOnly directory outside Git/OneDrive/network shares. Before live, a separately reviewed Windows adapter must independently obtain actual principal, trusted configured root, fully resolved path/volume/reparse status and effective DACLs for every parent/file; verify restrictive inheritance/ownership, configured sync exclusions, and failure on missing/corrupt/unwritable stores. Use durable pending-record flush and exclusive active-attempt protection before I/O, no-overwrite evidence, terminal record and separately trusted receipt. Do not implement that by accepting JSON model flags. No directory or ACL command is run by this task.

Owner must approve endpoint isolation, storage location/ACL/retention and trusted Windows administrator boundary. DPAPI/same-user storage does not isolate credentials from other processes running as the same user. One-shot memory state cannot withstand process restart, snapshot rollback or hostile administrator; do not use it as a live ledger.

## Evidence

Evidence always records mode=offline-synthetic, synthetic=true, actualOperator/Auth/Tls/Cloudflare=NOT_VERIFIED, liveReady=false and SYNTHETIC_MEMORY_ONLY storage. It contains exact target tuple/scope digest, public random attempt ID, safe status/stage/abort model, presentation-confirmation-claim-request ordering, approved schema digest and count/null. No full raw provider response, unknown DDL literal, header, auth material or arbitrary error text is retained.

Serialization allows only fixed fields/enums. An embedded payload hash plus a separately held complete-file SHA-256 fixture receipt detects changes. Tests recompute the embedded checksum on tampered data and still reject against the original receipt; secret/header-shaped added fields are rejected even with a recomputed digest. Neither checksum proves execution provenance or genuine API output. There is no live evidence artifact or storage receipt in this task.

## Offline use

Automated tests (safe synthetic fixtures):
~~~text
node tests/d1-operator-offline.test.mjs
npm run build
npm run typecheck
npm test
~~~

Manual **operator-run synthetic** rehearsal only, in an actual terminal:
~~~text
node scripts/rehearse-operator-d1.mjs staging --synthetic-rehearsal
node scripts/rehearse-operator-d1.mjs recovery --synthetic-rehearsal
~~~

Run them independently, never with piped input. Each displays the complete synthetic scope and confirmation phrase before accepting input. They simulate prerequisites and do not verify the operator, real host or storage. The agent did not invoke these interactive sessions; tests exercised refusal under non-TTY/piped conditions and presentation/confirmation through synthetic fixtures. There is no real/live command or automatic mode switch. Without the explicit rehearsal flag, invocation is refused because actual prerequisites are not implemented.

## Tests and operational blockers

Windows x64 Node v24.22.1: Build PASS (Demo 997247 / Production 995873 / Staging 996020 bytes), Typecheck PASS, all 22 suites PASS. New suite 133 cases: both targets, strict reserved/empty/empty-fleet success; identity/schema/data/permission/redirect failures; bootstrap/operator/host/storage refusals; one-shot/cross-target/confirmation denial; proxy/runtime/CA/loader/debug environment-name checks; TLS/timeouts/abort; evidence tamper/field redaction; noninteractive CLI denial. Child test environments are empty; fetch tripwire zero. Existing broker 75, N security 64, adapter 48, reserved 61 and initialization 28 remain PASS. No lint script. Exact-commit Linux CI result follows publication in PROGRESS.md; no Linux result is inferred from Windows.

| Operational gate | Actual status / required next |
| --- | --- |
| Operator register/principal/user presence and trusted bootstrap | NOT_VERIFIED; independently enroll person/role/principal; protected reviewed launcher |
| Host and loaded artifact/runtime integrity | NOT_VERIFIED; isolate from agent, protect executable/config/policy; prevent preload before process startup |
| Windows evidence/attempt persistence | MODEL ONLY; approve location, independently inspect ACL/reparse/sync and implement durable adapter |
| Auth/least-privilege scope | NOT_IMPLEMENTED / NOT_VERIFIED; operator-owned credential mechanism, private scope review; no values to agent |
| Real TLS/HTTPS timeout/abort/proxy/response bounds | SIMULATED ONLY; independently reviewed implementation and separately authorized network validation required |
| Actual Account/D1/current schema | NOT_VERIFIED independently for Staging/Recovery |
| Live execution / initialization / deployment | NOT_READY / NOT_APPROVED |

Next decisions: final owner/operator/host/storage and account-scope approval; separately scoped protected-bootstrap/storage and authenticated-transport implementation/review if wanted. Then request separate Staging and Recovery live read-only approvals. Nothing here authorizes those actions, credentials, real database writes, initialization, resources, deployment or merge. No Agent Lee Access, Production/Demo, R2/Cron/Worker/public-route changes.
