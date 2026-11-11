# PROD-1C — Local Production configuration preparation

Date: 2026-11-11. Branch: dev/smartfleet-batch-1. Baseline HEAD: 0bc70f097ed86bc5ad5ff020dd6cf8110cbabe53.
Overall release: NOT_READY. Local configuration preparation only; no Cloudflare API, credential access, export, deployment, resource/configuration changes, D1 writes, restore, initialize or merge performed.

## Configuration source and scoped change

The owner supplied verified Production binding identities for this task. This task did not independently refresh Cloudflare metadata.

| Binding | D1 name | Database ID |
| --- | --- | --- |
| DB | smart-fleet-production | ebbca318-17d1-4486-b925-d6c787472ba5 |
| BACKUP_DB | smart-fleet-production-backups | 7f598b1a-b263-4305-8f43-409d0dcf08f3 |

Added only BACKUP_DB to wrangler.jsonc and wrangler.production.jsonc. DB remains first, with its original name/UUID. Worker name, main entrypoints, workers_dev, compatibility_date and every pre-existing property remain identical to baseline. No vars, APP_PASSWORD value, secret declarations, routes, environment overrides, R2 or Cron were added or changed. No application source, package, lockfile, schema or workflow change. Untracked preview-error.txt retained without reading, modifying or staging it.

Exact repository deployment path: .github/workflows/deploy.yml runs build/typecheck/tests, then scripts/prepare-deploy.mjs with target production. That script reads wrangler.production.jsonc, validates the existing remote DB binding, adds account_id and writes ignored .deploy.config.json. The workflow then uses wrangler deploy --config .deploy.config.json --keep-vars. This flow was inspected, NOT executed. A plain Wrangler invocation without explicit config instead selects wrangler.jsonc, whose main is output/worker.js; the production-specific source selects output/worker-production.js. build.mjs copies the production bundle to worker.js. Both local entrypoints therefore retain the intended existing Production build.

Important remaining gate: prepare-deploy.mjs currently checks only the first DB binding; it does not independently verify BACKUP_DB or all existing Worker settings. --keep-vars preserves dashboard variables but is not proof that omitted resource bindings/routes/settings will survive. Before any future deployment, read current authorized metadata, compare every binding and relevant setting, verify APP_PASSWORD still exists with its existing secret/plaintext classification without retrieving its value, and stop on omissions or mismatches. Do not run the preparation script as an offline validation command: it calls Cloudflare. No current secret value is required in Git. No credential/config/secret rotation is approved.

## Local verification

Windows Node.js 24.22.2; existing installed Wrangler 4.116.0. No dependency changes or npm ci requested/performed in this task.

| Gate | Result |
| --- | --- |
| Correct branch and approved baseline HEAD | PASS |
| Both configs parsed/normalized by installed Wrangler unstable_readConfig | PASS |
| Deep comparison against git HEAD: exactly one added BACKUP_DB, all other properties identical | PASS |
| Unique DB/BACKUP_DB names and distinct expected UUIDs | PASS |
| npm run build | PASS — Demo 1061261 / Production 1059887 / Staging 1060034 bytes |
| npm run typecheck | PASS |
| npm test | PASS — all 31 suites, including Preview 36 and provisioning 66 cases |
| Fresh live account/Worker/settings verification | NOT_VERIFIED |
| Owner-supplied D1/binding identities recorded | PASS — supplied evidence, not a fresh API verification |
| Real export permission and verified backup | NOT_VERIFIED / NOT_RUN |
| Production Account v5 compatibility | NOT_VERIFIED |
| Actual compatible rollback artifact and rehearsal | NOT_VERIFIED |
| Exact new configuration commit Linux CI | NOT_VERIFIED — changes are uncommitted; baseline evidence is not new-config CI |
| Overall release | NOT_READY |

Synthetic test diagnostics for intentionally rejected unsupported account formats/backup configurations are expected; the full test process exited 0. No real data or browser acceptance was run in this task. Previously recorded baseline CI/mobile evidence remains historical evidence only.

## Backup export plan — NOT EXECUTED

Official Cloudflare D1 troubleshooting states export requires Account / D1 / Write (dashboard may label this Edit), not D1 Read. Export uses POST /accounts/{account_id}/d1/database/{database_id}/export and can lock the database while completing. Metadata read permissions do not establish export permission. Workers Scripts Read and Account Settings Read support the separate identity/settings checks; Workers Scripts Write is not needed merely for a D1 export. Do not add permissions automatically or probe export as a read-only check. Obtain separate owner approval for the temporary D1 Write scope and an agreed export window; limit to the approved account and available resource restrictions, with short expiry. D1 Write also authorizes destructive operations, which remain prohibited.

After separate approval only:
1. Re-verify the account, Worker and both exact UUID/name/binding pairs immediately before export. Confirm token validity/scope through operator-controlled metadata; never print the token or use it in arguments/files. Do not use a leaked/previous token.
2. Operator selects a non-sync folder outside every Git repository, e.g. D:\SmartFleet-Private-Backups. Validate the absolute path is not a symlink/junction to a sync/repository location and validate restrictive NTFS ACLs before any payload is written; no inherited broad read grants. Do not create or change that storage in this task.
3. Reserve timestamped filenames and refuse overwrite. The following are future templates, NOT runnable instructions for this task:

    node node_modules/wrangler/bin/wrangler.js d1 export smart-fleet-production --remote --config wrangler.production.jsonc --output <protected-absolute-path>\smart-fleet-production-<UTC-timestamp>.sql
    node node_modules/wrangler/bin/wrangler.js d1 export smart-fleet-production-backups --remote --config wrangler.production.jsonc --output <protected-absolute-path>\smart-fleet-production-backups-<UTC-timestamp>.sql

4. Record success, timestamp, byte size and SHA-256 in protected local evidence. No SQL, export download URL, credentials, account payloads or row values in chat, screenshots, Git or CI artifacts. This task created no backup and no checksum.
5. Inspect expected tables and data presence privately with a trusted local read-only parser. A full D1 SQL dump is not the same format as an application JSON/guarded SQL backup: do not upload it to the app or assume checksum alone proves restore compatibility. Rehearse import only in an isolated, non-network local SQLite environment with no external file/extension access. Inspect integrity and full record/ledger invariants privately, report counts/status only. Stop on unexpected schema/content. No restore SQL against any real D1 is authorized.
6. Preserve the owner's existing Time Travel bookmark privately; do not request its value or execute Time Travel. Verify actual availability/retention separately. A pair of database exports is not a guaranteed cross-database atomic snapshot; assess active writes and any BACKUP_DB coupling before calling a recovery point consistent. If quiescence or coordinated snapshot is needed, obtain a separately approved plan.

## Account v5 and rollback release gates

Use only an approved protected offline copy, with no raw payload logging, to validate actual Production Fleet/account versions with the release reader: legacy Admin/Employee, Account v5 reciprocal Person provenance, Fleet marker5 / JSON schema4 correspondence, strict status/role checks and root-admin/credential/session compatibility. Confirm all cars, people, trip IDs/ownerUserId/driverId, odometers, maintenance/audit entries and operation ledger records remain valid and preserved. Do not load real data through a helper that seeds an empty main/session key or writes data implicitly. Synthetic tests alone do not prove Production compatibility.

Capture current deployment/version/settings metadata without exposing secret values. Keep a reviewed v5-capable fallback build/config artifact and rehearse the exact reader against synthetic mixed-format data plus the protected approved offline copy. Legacy v4 readers may refuse Account v5/Fleet marker5. Never strip version/provenance, convert roles, backfill ownership, delete records or blindly use an older Worker version. Worker rollback does not roll back D1; SQL/Time Travel restore can discard all subsequent trips/accounts/ledger writes and needs separate approval. Prefer a forward fix preserving current data; if no compatible fallback can be proven, remain NOT_READY.

Before release: review and commit scoped changes only on dev/smartfleet-batch-1, record the exact candidate SHA, obtain passing Linux Node24 CI for that candidate, retain valid mobile evidence, refresh real identity/settings checks, complete verified backup/integrity/compatibility and rollback gates, then obtain separate deployment-execution authorization. No deployment command was run or approved by this preparation task.

## Official references

- [Wrangler configuration and keep_vars](https://developers.cloudflare.com/workers/wrangler/configuration/)
- [D1 export permissions / error 10000](https://developers.cloudflare.com/d1/observability/debug-d1/#error-10000-and-token-permissions)
- [D1 export API / temporary query unavailability](https://developers.cloudflare.com/api/resources/d1/subresources/database/methods/export/)
- [Policy v1.2 reader/rollback limits](AUTOMATIC_PERSON_V1_2.md)
