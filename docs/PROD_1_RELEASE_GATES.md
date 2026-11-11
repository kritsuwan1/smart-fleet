# PROD-1 — Production release blockers (2026-11-11)

Overall: NOT_READY. This task authorizes Development fixture repair, read-only diagnosis and a verified export only after permissions/identity pass; it does not authorize Deploy, Merge, IAM changes, D1 writes/restore/initialize, credential rotation, real-record changes or Cron/R2 activation. No cloud identifiers, tokens, SQL payloads or secret values are included here.

## Verified repair

Baseline8e525c584d8e6171ed0a98be54302fe0180f5bab on dev/smartfleet-batch-1; origin and remote HEAD checked. Owner D:\\smart-fleet tracked files unchanged at start; untracked preview-error.txt retained without reading/deleting/staging it. Repair developed/tested in a clean shared checkout on the same branch.

Reproduction: acceptance hardcoded2026-11-10T08:00 while the rolling Preview seed on Nov11 already held a trip for that car on Nov10T08:00–09:00. Actual synthetic Worker returned400 “ช่วงเวลาใช้รถซ้อนกับรายการอื่นของรถคันนี้”. The server collision rule was correct; no production validation was weakened.

Repair: optional Node-only fixtureDate/referenceDate pins just synthetic seed time. No CLI/HTTP override, external DB/file path or host override; default interactive Preview keeps its rolling date. Server/auth/session/transaction clocks stay real. Shared synthetic scenario clock2026-11-10T00:00:00.000Z creates the seed on Nov9, User trip08–09 and Employee trip10–11 on Nov10. Report month is explicitly selected, so later wall-clock months do not silently produce an empty report. Each viewport has a fresh RAM DB, random username suffix and asserted unique new Account/Person/trip IDs; operation-ID replay/lookup assertions remain intact.

Regression: frozen seed/chronology, Thai midnight day rollover reproduction, five invalid reference-date refusals before server start. Preview suite29→36 cases; total31 suites unchanged, provisioning66 retained. Fresh Edge157.0.4341.42 PASS360/390/768/1280 and800×390 landscape, signup/login/checkout/receipt/return/history/PDF, Admin/Employee,409/slow/double/lost-return/reload/401 and owner-only scopes; external attempts/page errors0. Windows Node24.22.2 npm ci42 added/43 audited/0 vulnerabilities, build/typecheck/all31 PASS. Exact-new-SHA Linux evidence is recorded after push in PROGRESS and this report; historical CI is not substituted.

## Gate table

| Gate | Status at review |
| --- | --- |
| Exact release implementation SHA / Linux Node24 | Pending new commit/run; require exact head_sha and all steps success |
| Browser acceptance | PASS4 widths + landscape on repaired synthetic fixture |
| Authentication | PASS existing login; account/user read scopes only |
| Worker metadata access | FAIL access: actual CLI response “No access to the specified resource” |
| D1 metadata/export permission | FAIL metadata access; export permission NOT_VERIFIED, no export attempted |
| DB and BACKUP_DB | Local config FAIL incomplete; remote IDs/settings NOT_VERIFIED |
| Backup path/bytes/SHA256 | NOT_CREATED / NOT_VERIFIED |
| Account v5 on isolated Production copy | NOT_VERIFIED, no Production copy obtained |
| Compatible rollback / forward-fix | NOT_VERIFIED against deployed version |
| Deployment | NOT_RUN, prohibited in PROD-1 |

## Cloudflare diagnosis

whoami succeeded with one authenticated account. Permission metadata contains user:read, account:read, offline_access; it contains no Workers/D1 permission. Read-only deployments list for the explicit Worker and d1 info for the named Production database both fail with no resource access. This is demonstrated insufficient resource authorization, not a reason to guess another account/UUID, relogin with broad scopes or create resources. Both failed probe request paths were independently compared in memory to the single authenticated account and matched; no account retarget occurred. Lack of Workers/D1 scopes and the actual no-access responses establish resource authorization is insufficient. Live Worker/D1 identity still cannot be certified from a config file or owner-provided binding names alone.

No auth/permission grants or credentials were changed in PROD-1. Existing token values were never read or printed. Prior broad-OAuth auto-review rejection was not retried or bypassed.

### Required owner Dashboard actions

1. Open Cloudflare Dashboard with the owning membership. Workers & Pages → smart-fleet → Deployments: inspect active version/provenance. Settings → Bindings: inspect DB and BACKUP_DB, linked D1 names, other bindings. Inspect Variables/Secrets **names/presence only**, routes/workers.dev/preview settings and triggers; do not reveal secret values or change anything.
2. Storage & databases → D1 → smart-fleet-production and smart-fleet-production-backups → Overview: independently verify name/Database ID/account privately. Record into an approved protected local inventory, not chat/Git. Owner evidence currently establishes names only; the backup database ID remains unknown to this review.
3. For API-based verification, owner may separately provision a Custom API Token under My Profile → API Tokens → Create Token → Custom Token, with Account Settings Read, Workers Scripts Read and D1 Read restricted to the owning account; Workers Routes Read restricted to affected zones only if routes must be inspected. Do not select the broad Edit Workers template/Global API Key. Owner controls credential entry/storage outside repository/chat; do not paste a token or identifiers here. Worker-level Viewer access is another provider-supported read-only route when applicable.
4. An export endpoint may require additional provider permissions beyond metadata/query access. Verify current accepted permissions and request only an explicitly approved operator-controlled export capability if Read is insufficient. Do not automatically add D1 Write or invoke write SQL. A successful whoami is not proof of export permission.

References: [Workers permissions](https://developers.cloudflare.com/workers/authorization/workers/), [API token permissions](https://developers.cloudflare.com/fundamentals/api/reference/permissions/), [D1 export API](https://developers.cloudflare.com/api/resources/d1/subresources/database/methods/export/).

## Configuration preservation readiness

Both tracked wrangler.jsonc and wrangler.production.jsonc declare only DB. BACKUP_DB is absent. scripts/prepare-deploy.mjs checks the first D1 binding and regenerates config from the incomplete local file; it is not a complete remote-preservation gate. Source does not use BACKUP_DB; its current deployed behavior is unknown. Do not run that workflow/config against Production.

A deployable config is deliberately NOT generated while trusted metadata is inaccessible. Do not guess/copy an unverified UUID. After approved read access, prepare a reviewed release config outside the incomplete default path, with: exact existing Worker/account; reviewed Production entrypoint/artifact hash; both verified DB and BACKUP_DB IDs; every additional existing binding and compatibility setting; keep_vars preservation with unchanged secret names; exact existing routes/workers.dev/preview settings; unchanged triggers, with no R2/Cron/public QR activation. Recompare against provider metadata immediately before any separately authorized deployment. keep_vars alone does not preserve omitted bindings.

Current Production build exposes QR assets except in Staging; whether that would activate a previously disabled capability is NOT_VERIFIED. This also requires comparison to the deployed version/settings before release.

## Backup and compatibility procedure — NOT EXECUTED

- No SQL export exists; filename/location/size/SHA256 are all NOT_CREATED. No SQL payload is in logs/Git/chat/CI. Do not label a proposed filename a backup.
- After resource identity and export authorization pass, use a non-sync location outside all Git repositories, e.g. a dedicated private folder on the owner disk. Disable inherited ACLs; allow only the approved operator and SYSTEM as appropriate; verify effective permissions and absolute path before export. Export only the exact verified Production D1 with pinned Wrangler to a unique UTC timestamped SQL file. No export is allowed to a guessed UUID or a repository path.
- Verify nonzero size and SHA256; privately validate schema/main/ledger presence and a read-only isolated secure copy. Do not print accounts, hashes, sessionKey, records or _cf_KV contents; never upload the copy. An unexpected schema/error aborts without repair. A partial or unverifiable export is not a valid backup.
- Retain owner's previously captured Time Travel bookmark separately; do not request/display its value or invoke Restore. Provider availability remains NOT_VERIFIED.
- In a secured isolated copy, run current strict v5/legacy account/provenance/reference/chronology validators and verify original IDs/trips/odo/Maintenance/audit/ledger remain unchanged. Do not call normal Production GET/login as preflight: readState can lazily initialize missing main/sessionKey. No Production schema/data normalization is allowed.
- Account v5/Fleet marker5 and JSON backup schema4 are not safely readable by old binaries. Worker version rollback does not roll back D1 data. Require a demonstrated v5-compatible fallback or approved forward-fix/containment plan; do not blindly roll back after signup writes. Any SQL/Time Travel restore risks losing post-backup operations and requires separately approved quiescence, current-state capture and recovery rehearsal. No restore is authorized in PROD-1.

Next necessary owner action is protected read-only resource access/metadata evidence. Until binding IDs, valid backup, actual v5 compatibility and credible rollback are independently proven, overall remains NOT_READY. A separate deployment execution task is required even after they pass.

