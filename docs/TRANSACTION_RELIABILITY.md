# Task 3D.3 — Transaction reliability (Development / offline verified)

2026-11-05, Asia/Bangkok. Repository kritsuwan1/smart-fleet, dev/smartfleet-batch-1. Prerequisite verified before development: 3D.2 implementation 77b3607, expected 13 changed files, docs-only follow-up a57bf7d on the branch, exact Linux CI 41755017762 success with 23 suites/163 validation cases on Node 24.22.1. No prerequisite failure was waived.

**Scope: new checkout/return requests carry stable operation IDs, with server-enforced replay/conflict and atomic persistence. Operator/Live/Initialize/Deployment remain DEFERRED.** Only synthetic SQLite/Miniflare/loopback tests were executed; no live D1/API/credentials/resources/Production/Demo/R2/Cron/routes or deployment/merge actions.

## Baseline reproduction

Compiled api.ts from the verified pre-change GitHub snapshot against local dependencies, with synthetic in-memory state. Double submits returned 200/409: the existing version guard already prevented that duplicate write, but a retry after a lost checkout reply returned 409 instead of confirming the original result. Admin return retry with a fresh version returned 200 and advanced version 2 → 3, treating the same return as another edit/audit write. Observed:
~~~json
{"doubleSubmit":[200,409],"lostStartReplyRetry":409,"returnRetry":200,"versionBeforeReturnRetry":2,"versionAfterReturnRetry":3}
~~~
No claim that baseline same-version CAS allowed two trips is made. The defects concern replay recovery, repeated return mutation and client response consistency.

## Request contract and authorization

New checkout/return clients send the existing action/data/version plus:
~~~json
{"tripOperation":{"id":"<stable lowercase UUIDv4>","kind":"start"}}
~~~
Return uses kind=return and its existing trip ID/end values. Unknown operation fields/invalid IDs/kinds/intent are rejected. ID is public request metadata, not authentication. Keep the **same ID, kind and payload** for an uncertain retry; version may advance independently. Do not manufacture a new ID to retry an unknown result.

[trip-operation.ts](../src/trip-operation.ts) derives an opaque row key from the current Fleet session-key epoch, authenticated actor ID and operation ID. The sorted-JSON payload fingerprint binds actor, vehicle, operation kind and every supplied data value; JSON property order is ignored, but changed values/types are conflicts. Client-supplied driver IDs remain subject to existing employee authorization. The actual normalized trip/result comes from existing server validation, not from an untrusted saved response.

Every request resolves currentUser first. A replay also reads current Fleet state after finding its operation, rechecks principal/role/driver scope and current trip ownership/car. Disabled/stale sessions remain unauthorized; role/driver changes do not replay old privileged data. Wrong payload under an already-used ID returns 409 OPERATION_CONFLICT without a mutation. An unrelated actor gets their own namespace and cannot replay another actor's result.

The operation result stores original tripResult and receipt snapshot, not a complete Fleet/accounts/session response. Replays return those original results plus a **fresh currently-authorized Fleet view** and replay metadata. The whole HTTP body is intentionally not frozen: current version/role filtering must stay current. Thus a recovered checkout can confirm its original open-trip snapshot even after a later return, while the current state correctly shows that return. Receipt details navigate to the latest current trip.

## Atomic persistence using the existing schema

[storage.ts](../src/storage.ts) adds writeTripOperation with no DDL, extra table, column or Fleet JSON field. Completed operations are separate fleet_store rows prefixed trip-operation:v1:. The original main row and optimistic version guard remain authoritative.

A single DB.batch contains:
1. Conditional operation-row INSERT only while main has the expected version.
2. Conditional main CAS UPDATE only when the row carries this attempt's server-generated commitToken.
3. A read assertion that rolls back an impossible partial record/main outcome.

The [official D1 batch contract](https://developers.cloudflare.com/d1/worker-api/d1-database/#batch) documents ordered transactional execution with rollback on statement failure. This implementation depends on that contract, and tests execute the SQL in SQLite transactions and the actual **offline Miniflare D1 engine**. No real Cloudflare transaction is certified by local tests.

Same-ID concurrent attempts resolve to the winner's stored result. Different IDs still compete through global main CAS; a loser receives 409 and may explicitly retry its unchanged ID/payload at a fresh version. Different vehicles do not bypass the shared-state version guard. There is no process-memory server lock and no unsafe sequential-write fallback if batch is unavailable.

When supported, keyed requests use withSession(first-primary) for a primary-first, sequentially consistent read/write context. After discovering a winning operation, Fleet is read again; an early snapshot without its new trip cannot be used to authorize the replay. This race was caught by the new tests and fixed. Promise rejection from replay is awaited inside the API error boundary.

On a lost batch acknowledgement, the API only reads back the operation/current state; it does not issue a second business write. If it cannot establish the result, it returns a safe 503/unknown outcome. Failed batches leave neither an orphan operation row nor a trip/audit/odometer update. Replay performs no repeated operation batch or effective main/ledger mutation; existing readState lazy initialization checks remain unchanged.

## Frontend behavior

[trip-submit.ts](../src/trip-submit.ts) manages a synchronous submission latch and an in-memory pending intent. [App](../src/App.tsx) also prevents same-task save dispatch and ignores outdated background loads. A hard 15-second acknowledgement deadline includes response-body consumption; aborting a client wait does not imply the server rolled back.

There is **no automatic application retry**. Network timeout/loss, 5xx and malformed acknowledgement retain the original operation and display an uncertain outcome, never a success receipt. Changed payload cannot be posted while that outcome is unknown. Checkout/return form values and in-app cancel/close are locked while unknown, with explicit same-operation retry available. Clear validation/auth/version failures remain explicit; version conflict refresh does not invent a successful result.

The server remains the duplicate-write boundary even if a browser/network stack resends a POST or UI disabling fails. Original trip validation, ownership, odometer limits, overlaps, reason requirements, maintenance data and version checks are retained. Keyed returns cannot silently become edits of an already-closed trip under a new ID.

## Compatibility, migration and rollback plan — not executed live

- SQL schema and Fleet shape: unchanged. No live schema migration is required. New operation rows appear lazily only with a successful keyed business commit; old readers use main and ignore the prefix. No existing row, vehicle/trip/history or security field is deleted/rewritten.
- Legacy requests without tripOperation retain the old CAS behavior for compatibility. **They do not gain the new replay guarantee.** The updated normal checkout/return UI sends keys; historical/manual trip edits remain existing semantics. Any future mandatory-key cutover needs an explicit compatibility decision.
- No old-client fallback after a keyed failure. New client + old backend lacks the acknowledgement contract and is treated as uncertain, not assumed success. Offline tests cover missing/invalid acknowledgement and missing batch capability; the old pre-change API behavior is reproduced above.
- Safe future rollout proposal: keep writes paused while checking the exact app/API pair and batch/session support on an approved isolated target; use synthetic two-request start/return/replay checks; confirm one version/audit change and operation record before accepting users. This task does not authorize staging initialization or deployment.
- Rollback proposal: stop accepting new checkout/return submissions; resolve/drain pending keyed attempts against the new backend and retain their results; preserve all operation rows/main data; then consider an explicitly approved matched frontend/backend rollback. **Do not roll back the server while keyed operations are unresolved:** an old API ignores IDs and cannot promise replay safety. No data rollback, ledger deletion, SQL migration command or deployment command is run/provided here.
- Existing main-only SQL/JSON/Fleet backups do not include the operational ledger. Existing restore rotates the session key, producing a new namespace; replay guarantees do not cross restore/key epochs. Real recovery remains deferred and must reconcile pending operations separately.
- No TTL/pruning is implemented: deleting records or accepting a reused old ID after expiration could repeat an operation. Ledger storage grows and is not measured by the main-payload status limit; retention/capacity policy remains a separate owner decision.
- Pending client state is memory-only for the current page. Reload/tab closure/session expiry can lose its ID; do not blindly resubmit as a new operation. Inspect current trips after reconnect/login. Durable cross-reload pending recovery is a remaining enhancement, not an implemented guarantee.

## Tests and actual results

[transaction-reliability.test.mjs](../tests/transaction-reliability.test.mjs): **45 scenarios**, part of npm test (24 suites). Covers duplicate/concurrent starts and returns, stale/fresh replay, original receipt after subsequent return, reordered JSON, changed payload/car/kind conflicts, cross-user isolation, revocation/demotion, invalid intent/odo, different-vehicle CAS/retry, rollback at each batch stage, lost acknowledgement, absent batch capability, primary-session selection, concurrent revocation, capacity refusal, malformed ledger, frontend double dispatch/timeout/late response/lost reply/return retry/statuses and malformed acknowledgements. No external fetch, real D1 or credentials.

[transaction-browser.mjs](../tests/transaction-browser.mjs) is an optional local test using existing ignored Playwright, not an app dependency or CI requirement. Actual Edge 156.0.4314.58 at 360px: two same-task submits produce one checkout POST; deterministic post-commit return-response abort shows unknown outcome with locked inputs/close/cancel; retry uses the same ID; main version stays 2, one trip/two audit entries/two operation rows. Browser requests are restricted to loopback; identity is injected, so this is not real login/physical-device/cloud UAT. The test reads the fieldset disabled property directly and does not assume ordering of concurrent request winners.

~~~text
node --experimental-sqlite tests/transaction-reliability.test.mjs
node --experimental-sqlite tests/transaction-browser.mjs .qa/browser/node_modules/playwright "<approved local browser executable>"
npm ci
npm run build
npm run typecheck
npm test
~~~

Windows x64 Node v24.22.1: npm ci PASS (42 installed/audited 43, reported 0 vulnerabilities; existing esbuild/workerd install-script restrictions retained), Build PASS (Demo 1008994 / Production 1007620 / Staging 1007767 bytes), Typecheck PASS, all 24 suites PASS including 45 new scenarios and all prior 23/security/validation/Backup/Maintenance/role/import regressions. No lint script. Exact-commit Linux result follows publication in PROGRESS; no earlier run is substituted.

## Remaining risks and next task

Guarantees apply to the same authorized principal/epoch/operation ID with retained records, through the new atomic path. They are not global “exactly once” across arbitrary new IDs, legacy clients, restored databases or lost browser memory. Real provider behavior and deployed client/API compatibility remain NOT_VERIFIED / DEFERRED. Existing onboarding/Staff/User and broader mobile/report findings remain.

Recommended next: owner decision for 3D.4 role/onboarding policy, and separately scope durable pending-operation recovery/retention if cross-reload guarantees are required. No Operator/Live/Initialize/Deploy/R2/Cron/routes or cloud action is resumed automatically.
