# Seed-free recovery candidate — PROD-1I local implementation

Status: candidate / NOT_READY. No deployment approval. Operator independent content/runtime acceptance and exact new-source Linux CI are pending. Historical binary rollback remains unverified; this candidate is a v5-capable forward-fix base, not proof that an arbitrary future defect is fixed.

## Source and behavior

Base commit65de27dd41f3b813a1b1f012f70151f6fecf464d plus uncommitted reviewed worktree inputs. Owner subsequently authorized a scoped recovery commit/push and exact-SHA Linux tests. Before commit manifest.json records sourceCommit:null; after commit it records the exact HEAD only if runtime/build/config/test paths are clean (including untracked files). baseCommit and the SHA256 over sorted input names/raw-byte hashes remain recorded. This is content identification, not a Git commit or signed provenance. A trusted external archive checksum is needed to anchor manifest verification.

Normal builds explicitly compile recovery=false. Original bootstrap/QR/vehicle display constants were extracted unchanged; normal login, initialization, original import and operations retain their behavior and regressions. Recovery compiles client and server separately, aliases exact bootstrap/seed/static-vehicle/QR renderer modules to empty data, excludes QR/vehicle image assets and uses a neutral client initial state. It preserves runtime records from D1; it does not redact stored People or trips.

Recovery never creates main/sessionKey. Missing/invalid DB, table, main, JSON/account format, sessionKey or state version returns503 RECOVERY_STATE_REQUIRED without SQL mutation. Existing valid read/write/auth/backup/CAS/operation ledger paths remain. Direct legacy action='import' is rejected after authorization, before action mutation, with403 RECOVERY_SEED_IMPORT_DISABLED; uploaded XLSX imports remain separate. Static QR and excluded vehicle-image endpoints return404; recovery UI hides the QR tab. No new endpoint, role, data schema or live resource.

## Offline build/reproduce commands

Run only on the exact reviewed local source tree on dev/smartfleet-batch-1. Checking out the base commit alone does not reproduce these uncommitted changes. Preserve unrelated files and do not run npm ci against a locked preview process.

    Set-Location D:\smart-fleet
    node --version
    npm.cmd --version
    npm.cmd ci
    npm.cmd run build
    npm.cmd run typecheck
    npm.cmd test
    npm.cmd run build:recovery
    python scripts/package-recovery.py --output C:\Users\krits\SmartFleet-Recovery\NEW-UNUSED-NAME.zip

Node24.22.2, npm11.19.1, esbuild0.28.1, Wrangler4.116.0 and TypeScript5.9.3 are pinned/recorded; package-lock.json is unchanged. Builder enforces Node/compiler versions. ZIP uses sorted entries, fixed1980 timestamps, fixed permissions and ZIP_STORED to avoid compression-version differences. Local repeated build/archive equality is verified; cross-platform binary equality/new-source Linux execution are NOT_VERIFIED. Normal output files and normal client bundle are checksummed before/after recovery building and must remain unchanged. No Cloudflare/credential/D1 access during build or packaging.

Package allowlist: worker.mjs, wrangler.recovery.jsonc, manifest.json, acceptance.json, verify.mjs, RUNBOOK.md, CHECKLIST.md, pins/package-lock.json. Source archive/Git/history, fixtures, dependency directory, SQL/SQLite, .env/.dev.vars, runtime secrets, data and raw logs are excluded. Dependency graph and decoded static identity scans must pass. No real token/password/database payload is supplied to compilation. Automated scans do not replace independent operator content review of bundle/assets.

## Verification-only operator commands

Use the separately supplied trusted archive checksum, not merely a checksum read from the archive itself. Extract to a new empty local directory and refuse unexpected files/links/overwrites. Then:

    Get-FileHash -LiteralPath <accepted-candidate.zip> -Algorithm SHA256
    node <accepted-content-directory>\verify.mjs

The verifier reads only the allowlisted files, compares sizes/hashes/config and offline acceptance evidence, and never executes the Worker or calls a network/API. It verifies consistency, not an author's identity/signature. Keep a protected original checksum/manifest and compare the sourceTreeSHA256 against the reviewed local tree before building any later fix.

## Forward-fix operator sequence — requires separate approval

1. Independent operator reviews immutable artifact/manifest/checklist, source diff and content exclusion evidence. The scoped source commit/push is now authorized; obtain exact-SHA Linux/actual-artifact verification before release; prior base CI is not new-source evidence.
2. Refresh authorized account/Worker/current version/full settings and both DB/BACKUP_DB identities. Verify existing APP_PASSWORD classification/value preservation privately without copying its value into files/logs. Reconcile all other bindings/routes/vars/secrets/triggers. No credential rotation, Cron/R2 activation or automatic provisioning.
3. Verify backup freshness/integrity and current v5/legacy/session/ledger compatibility; rehearse failures synthetically. Do not automatically restore an old SQL/Time Travel snapshot. Missing or unsupported state is an abort condition, not permission to initialize or repair it.
4. Obtain explicit owner approval for the exact accepted archive hash, settings and forward-fix execution. The candidate has no defect-specific operational acceptance merely because tests pass. Do not use scripts/prepare-deploy.mjs as a complete settings-verification gate; it currently checks only the first DB.
5. Only after all prior gates PASS and separate Production execution approval, the proposed explicit command is:

    node D:\smart-fleet\node_modules\wrangler\bin\wrangler.js deploy --config <accepted-content-directory>\wrangler.recovery.jsonc --no-bundle --keep-vars

DO NOT RUN in this task. Use the tested pinned Wrangler and accepted payload; --no-bundle avoids rebuilding the reviewed Worker. Config differs from the approved production source only in main=worker.mjs; it contains no APP_PASSWORD value. --keep-vars alone does not verify every remote setting. Never fall back to default local config/output or another Worker/account.

6. After a separately authorized action, independently confirm deployment/version/traffic and complete bindings/settings, then perform pre-reviewed non-destructive smoke checks without fake production accounts/trips. Review handlers first: a GET/login can otherwise seed/rate-limit/write. This candidate refuses bootstrap but authorized operational transactions remain genuine writes and are not smoke tests.
7. Abort on wrong identity/hash/config/state/session/authorization, unexpected writes, failed checks or uncertain result. Preserve DB/ledger and investigate; no blind resubmit/new operation ID, forced unlock, marker downgrade, account conversion, ledger deletion or stale snapshot restore. Use only an independently accepted v5-compatible forward fix.

## Local acceptance evidence and limits

Windows Node24.22.2 normal build/typecheck and all31 pre-existing suites PASS; provisioning66 retained. Actual recovery bundle suite34 PASS with synthetic in-memory SQLite, legacy/v3/v4/v5/mixed states, missing-state zero writes, seed/QR refusal, atomic-stage failures/retry, CAS, same-ID concurrency, lost acknowledgement/fresh-module lookup, return replay, disabled denial and original data/ledger preservation. No real data is used in these tests. Physical browser/mobile behavior for the recovery variant and independent operational review are NOT_VERIFIED. No live Cloudflare/database operation or deployment performed. Scoped commit/push and Linux verification are authorized as the next step; final exact-SHA evidence is recorded separately after execution.


## PROD-1J — mandatory release hold after settings review

Operator evidence observed2026-11-11T13:08:36.254Z confirms current version684c38d0-240f-47f8-8bef-3a3f6ae2f2aa at100%, both expected D1s, no other/R2 bindings, workers.dev and Preview URLs enabled, one Cron and matching compatibility date. placement/logpush/tail_consumers/usage_model fields exist but their values and the Cron expression/purpose were not supplied. Do not guess or replace them with defaults.

Pinned Wrangler4.116.0 leaves current Cron definitions unchanged when triggers/crons are omitted, and leaves Preview URLs unchanged when preview_urls is omitted. This proves configuration update intent, not behavioral continuity: with the supplied binding set the candidate scheduled handler has no automatic-backup enable flag/R2 and does no backup. Historical schedule purpose/required behavior is NOT_VERIFIED. Stop release until preserving that behavior or an explicitly approved limitation is proven; do not silently delete/disable Cron or enable R2.

workers_dev=true matches the existing URL. Preserving current Preview URLs=true is the unchanged-setting policy for this task, not approval to browse a version URL against Production D1 or change exposure policy. New versions may receive Preview URLs under that existing setting; owner must accept this in final policy review. placement/logpush/tail_consumers/usage_model values and provider omission semantics still need review. --keep-vars is not a full-settings preservation mechanism. No configuration values were guessed or changed here.

A recovery-only Maintenance heading wrap fix is local/uncommitted; the new candidate has sourceCommit:null and a new sourceTreeSHA256. The prior bf8edc3 CI applies to the old code only. No commit/push is authorized in PROD-1J. Final candidate operator acceptance, fresh backup/compatibility and settings/Cron gates remain NOT_READY, even if local/browser tests pass. No deployment command above is authorized while this hold exists.

## PROD-1K — D1 backup continuity (local implementation only)

Owner-approved offline implementation adds D1 scheduled backup through existing BACKUP_DB, consistent Fleet+ledger snapshot, immutable daily publication/read-back SHA-256, guarded seven-Thai-day retention, redacted status/failures and synthetic restore/replay tests. No schema/config/cloud changes. Historical daily rows are preserved; same-day collisions and old-writer overlap block cutover. Source/envelope size limits and retained legacy backlog require operator review. Normal/recovery share the D1 handler; no R2 activation. See [D1_AUTOMATIC_BACKUP.md](D1_AUTOMATIC_BACKUP.md) for limits and acceptance gates. Final local evidence follows in output/recovery; Linux/exact-new-SHA CI, live schema/control/size, placement, fresh backup and independent acceptance NOT_VERIFIED. No commit/push/deploy authorized; Production remains NOT_READY.

## PROD-1M — fix PROD-1L findings (offline, no Commit/Push)

2026-11-12 Asia/Bangkok. Scheduled normal/recovery require D1 BACKUP_DB and explicitly fail on absence; fetch/login/trip behavior remains covered by regression. Retention uses10-row BINARY keyset pages through a fixed upper watermark, advancing past legacy data with a100-page bound and explicit incomplete-retention failure; verified current snapshot and conditional delete fences retained. Schema uses table_xinfo, rejecting generated/hidden/incompatible columns. Final daily snapshot re-read plus newer successful control validation permits legitimate concurrent completion while preserving corruption/disable/failure refusal. Tests add32 cases including6 original assertions failing against frozen before-fix source and passing after fixes; existing R2 helper tests remain separate while old scheduled expectations now require D1. Packaging requires matching remediation evidence. See D1_AUTOMATIC_BACKUP.md; final full-suite/artifact results follow. Linux/live schema/settings/placement remain NOT_VERIFIED; Production NOT_READY. No real DB/cloud operations or config/credential changes; prior Maintenance edits and preview-error.txt preserved.

Final PROD-1M Windows evidence (2026-11-12 Asia/Bangkok): Node24.22.2 normal build/typecheck PASS; npm test PASS all34 suites, retaining D1 backup60, recovery34 and provisioning66 plus new remediation32 cases. All6 original regression assertions FAIL against frozen pre-fix modules/artifacts and PASS after fixes. Both actual normal/recovery artifacts tested for missing binding, retention past100 legacy rows, generated schema refusal and concurrent completion; zero external calls. Current behavior supersedes earlier PROD-1J/K no-backup/retention-gap descriptions. Full fresh ZIP checksums and acceptance report follow in ignored .qa/prod1m; source uncommitted and Linux/exact-SHA CI NOT_VERIFIED. No Commit/Push/Deploy or real DB/cloud operations. Ready-for-commit-review recommendation is offline only, not Production approval.

PROD-1M F1 status consistency: Admin HTTP backup-status also requires D1 and returns503 when configuration/schema is missing, preventing stale R2 success from being displayed. Legacy R2 status helpers remain direct offline tests only. Four additional actual normal/recovery HTTP status cases bring remediation to32; final rerun supersedes the earlier28-case evidence. No other fetch/login/trip behavior or authorization changed.

Final PROD-1M acceptance superseding intermediate artifacts (2026-11-12 Asia/Bangkok): normal build/typecheck and all34 suites PASS under Node24.22.2. Remediation32 cases PASS (including four HTTP status regressions), original6 frozen-before assertions FAIL as expected then PASS after fixes; D1 backup60/recovery34/provisioning66 retained. Admin status and scheduled handlers now consistently require D1, with explicit503 status when missing rather than legacy R2 success. Candidate01 is superseded by the final candidate02 archive/hash in the ignored PROD-1M report; preserve both without deployment. No application failures remain in the final run. Linux/exact-commit CI, real schema/control/capacity/placement/backup freshness and independent operator acceptance are NOT_VERIFIED. Offline recommendation READY_FOR_COMMIT_REVIEW; Production remains NOT_READY.
