# Task 3C.2L — Live D1 read-only verification preparation

Task 3C.2M adds a working Mock-only broker, offline CLI and redacted evidence persistence; see [D1_MOCK_BROKER.md](D1_MOCK_BROKER.md). Historical "no broker/recorder" statements below now apply to live integration only. Live mode is unconditionally disabled, including with a manifest; no real authentication/approval mechanism is implemented. Separate per-target approval and reviewed live implementation remain required.

2026-11-02, Asia/Bangkok. Repository kritsuwan1/smart-fleet, branch dev/smartfleet-batch-1. **Preparation/mock tests PASS; live verification NOT_RUN / NOT_VERIFIED.** This is the review package for the next round, not permission to connect. No Cloudflare API request, credential/token creation/read/display, Agent Lee Access, real environment change or resource action occurred. Reading public documentation is not live account/API access.

## Approved identity and current evidence

Account: 8853419a19293131998afe07ee651e62. Dashboard evidence dated 2026-11-01 is recorded independently per target in D1_RESERVED_SCHEMA_COMPATIBILITY.md. It is not actual API metadata or a current schema lock.

| Target | Database name | UUID | Binding/config |
| --- | --- | --- | --- |
| staging | smart-fleet-staging-db | f71ba325-027c-4b3f-abb2-71492493a8cf | DEMO_DB / config/staging-no-r2.example.jsonc |
| recovery | smart-fleet-recovery-db | 5ec99f9c-4919-41f4-9bc4-c8c564a60296 | RECOVERY_DB / config/recovery-d1.example.jsonc |

Account/D1 tuple allowlist is not expanded. Review found the previous adapter accepted any syntactically valid Account ID before metadata inspection. Adapter and provider-verifier entry points now reject every other account **before transport/read access**. Generic planner metadata remains strict for the reserved exception. This closes a request-scope gap rather than adding an account/database.

## Official endpoints and minimum proposed permissions

Public references rechecked 2026-11-02. Origin is exactly https://api.cloudflare.com/client/v4; no alternative host, path/query parameter, account-wide database list, token endpoint, Worker or deployment endpoint is allowed.

| Operation | Exact endpoint shape | Proposed read permission / response evidence |
| --- | --- | --- |
| Account identity | GET /accounts/{approved-account-id} | Account Settings Read is among the documented accepted permissions; compare response result.id, retain only id/name |
| D1 identity | GET /accounts/{approved-account-id}/d1/database/{one-allowlisted-uuid} | D1 Read; compare result.uuid/name against target |
| Schema / conditional application count | POST same D1 path + /query | D1 Read is accepted; one fixed SELECT per request with params=[]; POST is the API query protocol, not permission to send write SQL |

Sources: [Account Details](https://developers.cloudflare.com/api/resources/accounts/methods/get/), [Get D1 Database](https://developers.cloudflare.com/api/resources/d1/subresources/database/methods/get/), [Query D1 Database](https://developers.cloudflare.com/api/resources/d1/subresources/database/methods/query/). Use read permissions only; no D1 Write, Workers Scripts Write, token management or resource-creation permission is needed/proposed. Actual assigned permissions and authentication compatibility are NOT_VERIFIED. On 401/403 or unsupported authentication, stop; do not fall back to a Global API key or broaden permissions.

Cloudflare documents resource-scoped permission policies in [API token creation guidance](https://developers.cloudflare.com/fundamentals/api/get-started/create-token/). A future operator must inspect the selected authentication mechanism's actual resource summary privately. Do not assume D1 Read limits a credential to two database UUIDs: per-database credential scoping has not been verified here. If permission covers the whole approved account, an independently enforced broker request allowlist is necessary to exclude Production/Demo databases in that same account. If that isolation cannot be established, do not run live verification. No token is created/inspected by this task.

Only SQL strings exported by d1-initialization-safety.mjs are allowed:

```sql
SELECT type,name,tbl_name,sql FROM sqlite_schema WHERE name NOT GLOB 'sqlite_*' ORDER BY type,name
SELECT COUNT(*) AS row_count FROM fleet_store
```

COUNT is conditional on the planner accepting the exact fleet_store schema. It is skipped if no fleet_store exists. No user-supplied SQL, multi-statement batch, extra SELECT/PRAGMA, initialization SQL, payload query or _cf_KV key/value/count query is allowed. Account and D1 IDs come from responses, not echoed Config/path values. Reserved schema acceptance remains the exact K policy with a fresh target-bound 60-second capability; no policy relaxation is made here.

## Proposed authenticated transport — operator controlled, not implemented/connected here

Use a trusted operator-owned, isolated transport/broker outside the agent session. An existing authorized read-only authentication mechanism may be supplied privately by its owner **only after separate approval**. The agent receives neither token/header values nor credential-store/browser-profile access. Do not enable Agent Lee Access, expose a generic HTTP proxy or grant broad app access. This is an architecture proposal; no existing broker/session/access is asserted.

The future broker must:

- Hold the authentication material in the operator-controlled process; never expose it in arguments, files committed to Git, environment changes made by the agent, chat, stdout, HAR/debug traces or response evidence. This task provides no secret-loading code or authentication setup command.
- Independently enforce the fixed HTTPS origin, exact approved account and selected target UUID, only the two metadata GETs and exact query POST bodies above; never accept arbitrary URL/SQL/headers from callers. No target discovery/listing or Production/Demo call is permitted.
- Require an explicit operator approval manifest before **any** metadata call. Bind approval to reviewed source/config/policy hashes, one named target, request budget, time window, operator and evidence destination. The existing adapter is a library, not an approval-enforcing broker. A boolean supplied by an untrusted caller is not approval.
- Use redirect:error, normal certificate verification, a 15-second request timeout, no redirect following, transparent retry, proxy retargeting or alternate target. Respect AbortSignal and stop on the first failure. Do not disable TLS checks or inherit an unreviewed proxy/session.
- Return only fetch-compatible responses to the adapter. Do not fabricate or rewrite identity/schema responses. Keep auth entirely out of returned objects/error messages. Drop raw provider bodies after required validation; error evidence contains a safe stage/category and HTTP status, not provider messages or headers.
- Revalidate approval and exact outbound request at the transport boundary. A matching application allowlist alone cannot constrain a malicious or overprivileged injected transport. Reject an expired/reused request budget rather than retry automatically.

Implementation and private operational review of that transport/harness remain prerequisites for a live round. No runnable live CLI, broker, credential workflow or evidence recorder is claimed to exist. If an appropriate existing operator transport is unavailable, remain NOT_VERIFIED rather than create credentials/access as an implicit step.

## Operator approvals and execution sequence — for next-round review only

1. Review this document, exact Development commit and passing tests; independently recheck source/config/policy hashes. No main merge, deploy workflow or remote initialization command is involved.
2. Review authentication ownership and non-secret permission/resource summary privately. Authorize only use of an existing suitable read-only mechanism, or stop for a separately scoped authentication setup decision. This task does not authorize creation/inspection of credentials or granting new permissions.
3. Approve a **Staging-specific** manifest: account, source UUID/name/DEMO_DB, exact requests/SQL, maximum four requests (two metadata GETs, one schema POST, one conditional fleet_store count POST), no retries, bounded execution window, safe evidence destination and stop rules. Approval must explicitly permit the SELECT-bearing POST.
4. Only after transport/harness review and that approval, the operator may use the existing adapter interface in their approved process:

```js
// FUTURE integration sketch, NOT a live command or an implemented harness.
// reviewedConfig and approvedAuthenticatedTransport are operator-owned inputs.
const adapter = await createD1ReadonlyAdapter({
  target: 'staging',
  config: reviewedConfig,
  expectedAccountId: '8853419a19293131998afe07ee651e62',
  transport: approvedAuthenticatedTransport
});
const result = await adapter.review();
```

Creating the adapter already performs metadata requests; approval must precede creation, not just review(). Keep creation/review contiguous so provider capability does not expire. On expiration, stop; another explicitly approved attempt is needed, not a silent retry.

5. Verify evidence and compare actual target-linked metadata/schema with the separate Dashboard record. Unknown object, altered exact DDL, populated fleet_store, mismatch, timeout, redirects, permission/query failure or unavailable evidence means refusal/NOT_VERIFIED, not empty or READY. review() emits no schema rows: a reviewed broker/harness must capture the schema response safely as specified below; no such capture exists by implication.
6. Close the Staging attempt before proceeding. Approve **Recovery separately**, with its UUID/name/RECOVERY_DB/config and a separate evidence file; repeat at most four requests. Do not share metadata/capability/results across targets. Recovery is never attached to a Worker or normal app startup. The two scopes may be reviewed together only if two explicit manifests/attempts remain distinct.
7. Stop after read-only reports. Even a live PASS does not approve or make initialization automatically READY: separate initialization authorization, renewed immediate identity/schema preflight, write isolation and post-check plan remain required. Never call prepare/run an initialization SQL executor, Worker/R2/Cron/route endpoint or resource command in this verification round.

Proposed approval fields (no credentials): approval reference/operator/time/expiry; source commit and hashes; target; approved Account ID; expected name/UUID/binding; allowed request shapes/SQL hashes; request budget; evidence location; statement "read-only metadata/schema and conditional fleet_store count only; no initialization/deploy/credentials changes". No manifest is signed or submitted in Task L.

## Evidence plan — not a fabricated live result

Use separate private ignored artifacts, e.g. .qa/d1-evidence/<approval-reference>-staging.json and -recovery.json. Do not commit raw live responses. After an approved future attempt, capture:

- Mode=live or mock explicitly; approval reference, reviewed source commit/config/policy hash and operator reference.
- startedAt/finishedAt in UTC ISO-8601 plus Asia/Bangkok display time; per-request timestamps/stage/status. Record expected values separately from observed API result.id/uuid/name.
- Full inventory of schema object names/types/tbl_name plus DDL digest. Store raw DDL only for the exact already-reviewed _cf_KV/fleet_store definitions; for unexpected definitions retain a digest and refusal category, not arbitrary literals. Never record any protected-table rows, Fleet payloads, session keys or credentials.
- Whether fleet_store exists and its count only if that exact allowed count was actually requested; otherwise record null/not queried, not an invented zero. Record Dashboard comparison reference/time separately from API evidence.
- PASS/refusal/NOT_VERIFIED and safe reason. No token fingerprint, Authorization/Cookie headers, request/response auth material, raw error body or arbitrary nested provider metadata. Locally hash the redacted evidence file for traceability after capture; a hash is not proof of API provenance by itself.

Preparation template (values are deliberately not observations):

```json
{
  "mode": "plan-only",
  "target": "staging",
  "approvalReference": null,
  "startedAt": null,
  "finishedAt": null,
  "expectedAccountId": "8853419a19293131998afe07ee651e62",
  "expectedDatabaseId": "f71ba325-027c-4b3f-abb2-71492493a8cf",
  "observedMetadata": null,
  "schemaEvidence": null,
  "fleetStoreCount": null,
  "result": "NOT_RUN"
}
```

Recovery uses its own target/UUID/template and observations. It must never inherit Staging's observed fields. Adapter summary dashboardSchema=NOT_VERIFIED remains a reminder that human Dashboard reconciliation is separate, not a claim that recorded K evidence disappeared.

## Actual checks and final disposition

Mock tests cover approved/wrong account before network/read, exact paths/SQL, redirect rejection, wrong metadata, query/permission failures, unknown schema/occupied refusal, reserved identity capability and expiration. The adapter account scope gap was fixed without expanding Account/DB Allowlist. Tests now use the public approved Account ID in synthetic responses (not credentials); K exact-schema Mock acceptance is exercised with approved context and generic/copied context remains refused.

Windows x64 Node v24.22.1: three related suites PASS (48 adapter, 61 reserved, 28 initialization fixtures); Build PASS; Typecheck PASS; full npm test PASS all 19 suites. No dependency/schema/SQL/config/Business Logic changes. New Linux result follows publication in PROGRESS.md.

PASS: preparation, endpoint/permission documentation review, request-scope tightening and Mock checks. PENDING: operator approval, actual existing authentication/permission validation, trusted broker/harness/evidence capture review and independent per-target live metadata/schema checks. Real API identity/schema NOT_VERIFIED; live execution NOT_READY until these gates are explicitly resolved. No token or permission creation/read, Agent Lee Access, initialization, deploy, merge, Production/Demo, _cf_KV data, R2/Cron/routes or Cloudflare resources were accessed/changed.
