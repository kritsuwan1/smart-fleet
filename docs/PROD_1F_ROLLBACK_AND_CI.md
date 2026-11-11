# PROD-1F — Rollback verification and exact-candidate Linux CI

Date: 2026-11-11. Branch: dev/smartfleet-batch-1. Parent/baseline: 0bc70f097ed86bc5ad5ff020dd6cf8110cbabe53. Scope: reviewed local release configuration/docs, offline tests, Development commit/push and existing Linux test workflow only. No Cloudflare deployment, restore, real database writes, secret changes or merge.

## Rollback result: NOT_VERIFIED

Owner's last observed Production version: 684c38d0-240f-47f8-8bef-3a3f6ae2f2aa, Worker smart-fleet. A version identifier or historical deployment list does not prove current deployment identity, binary availability, Git/source mapping, D1/secret/binding compatibility or v5 reader behavior.

This process has no inherited Cloudflare API token. No alternate OAuth credential was used and no Cloudflare API was called. Repository release docs/scripts/tests contain no verified mapping from that version to an executable artifact/source SHA. No exact archived artifact was supplied or downloaded. Its ability to read even the current legacy snapshot, and especially future Account v5, therefore remains NOT_VERIFIED. Do not infer the old binary's behavior from its date, app version label or a frozen guard fixture.

PROD-1E established a checksum-matching owner-held primary SQL export, safe isolated local SQLite import/integrity, actual release reader and backup validator acceptance, schema/row preservation and zero mutation attempts. The backup contains legacy accounts; no v5/unlinked or operation-ledger rows were present. Raw SQL, credentials, account/Person/trip payloads and private-copy files remain outside Git; this report publishes no payload. Existing synthetic tests separately cover unlinked restrictions, v5 provisioning/provenance, mixed-format old-reader refusal and transaction replay. They are not tests of the exact deployed binary.

## Feasibility matrix

| State / evidence | Safe conclusion |
| --- | --- |
| Current release reads legacy offline snapshot | PASS from PROD-1E; no destructive migration required by that reader |
| Known historical v4 guard rejects mixed marker5 | PASS in synthetic regression; not identity proof for deployed version |
| Exact old deployed binary reads current legacy copy | NOT_VERIFIED: missing artifact/source mapping |
| Exact old deployed binary reads v5 + legacy mixed state | NOT_VERIFIED: missing artifact and isolated rehearsal |
| Old binary can be used after new v5 signup | Not authorized/proven; stop rather than assume compatibility |
| Matching old D1 snapshot is available | Not sufficient for safe rollback: a stale snapshot can lose later accounts/trips/ledger writes |
| Compatible reviewed fallback/forward-fix artifact | NOT_VERIFIED: must establish and rehearse before release |
| Actual Worker rollback | NOT_RUN / NOT_APPROVED in this task |

Policy v1.2 writes Account5 and reciprocal Person provenance with Fleet marker5; JSON backup schema4 is required for that state. Existing historical strict readers may reject it; older permissive/coercing readers could create a security risk. No rollback may strip markers/provenance, convert roles, backfill ownerUserId/driverId, delete ledger/history or bypass strict readers. Worker code rollback leaves D1 contents at their current state. A corresponding D1 snapshot might be necessary for an incompatible binary, but reverting D1 is not automatically safe or approved and cannot be used to hide loss of subsequent writes.

## Exact operator procedure — documentation only, DO NOT execute in PROD-1F

1. Immediately before a separately approved deployment/recovery action, authenticate using operator-controlled credentials in the approved account. Refresh current deployments and target version metadata, both D1 bindings, all variables/secret names and routes/settings. Never display variable/secret values. Confirm the old version remains available/eligible; stop if identity or resource state differs. Capture sanitized metadata in private evidence. Do not treat the last observed version as current without this check.
2. Obtain the exact archived target Worker artifact and associated metadata through an authorized read-only mechanism. Record artifact hash and trustworthy version-to-source/build mapping. A same-named local output or guessed Git date is insufficient. If no trustworthy artifact can be obtained, keep rollback NOT_VERIFIED and select a reviewed compatible forward-fix strategy instead.
3. Run that exact artifact offline with outbound network disabled, synthetic secrets and an isolated local D1 adapter. First use a read-only adapter on the approved protected legacy copy; no missing-main/session seeding or automatic migration is allowed. Compare complete schema/rows before/after. Report status/counts only. Any real login secrets remain unavailable/unread.
4. Separately test synthetic mixed legacy/v3/v4/v5 data including disabled/unlinked states, own-only views, session invalidation, reciprocal provenance, backups and same-ID/CAS/ledger replay. Prove rejection has zero writes and that valid current records are preserved. Never inject synthetic signup into the protected Production snapshot. Rehearse any mutation only on wholly synthetic fixtures. If unsupported, refuse code rollback while that state can exist in Production.
5. Establish a reviewed v5-capable fallback/forward-fix artifact and exact configuration. Prove it preserves current state/ledger and both DB/BACKUP_DB bindings, APP_PASSWORD behavior, secrets, routes, compatibility settings and all other resources. Keep the approved current candidate artifact too; no unreviewed rebuild or config regeneration during an incident. Lack of this proof blocks release.
6. Obtain separate explicit owner authorization for the exact target version and recovery action. Reconfirm a fresh verified backup and preservation plan. Do not execute SQL restore/Time Travel: those are separate data-recovery decisions with a write-loss assessment and specific approval.
7. ONLY after all prior gates PASS and separate recovery approval, the installed Wrangler 4.116.0 help supports this explicit-version operation:

    node node_modules/wrangler/bin/wrangler.js rollback 684c38d0-240f-47f8-8bef-3a3f6ae2f2aa --name smart-fleet --config wrangler.production.jsonc --message "Owner-approved compatibility-verified recovery"

   This command changes a Cloudflare deployment and is prohibited in this task. Do not use it while the target remains unverified; do not omit the version or use --yes. The config flag selects context, not a promise that the old version retains the newly added binding. Verify the old version's own settings first. Required future Worker write permission is not requested, created or used here.
8. After any separately approved recovery, independently verify deployed version/traffic/settings and perform agreed non-destructive smoke checks without creating accounts/trips. Keep D1 unchanged. On failure stop and use the approved compatible forward fix; do not cycle older versions or restore a stale database blindly.

## Production configuration and local validation

Both wrangler.jsonc and wrangler.production.jsonc now contain the owner's verified DB and BACKUP_DB name/UUID pairs. Deep comparison against the baseline allows only the additional BACKUP_DB object; all original properties must remain equal. No APP_PASSWORD/vars/secret value, route, environment, compatibility setting, Worker entrypoint or production application code changed. The workflow generates .deploy.config.json from wrangler.production.jsonc and uses --keep-vars. Its current preparation script checks only the first DB; full fresh remote reconciliation remains mandatory and is not solved by this config change.

Windows Node24.22.2 build/typecheck/all31 suites PASS in PROD-1F; includes provisioning66, signup60, guards172, Person-link81, recovery63, transaction45 and Preview36 cases. Existing PROD-1C installed-Wrangler validation is rechecked before commit. No dependency or test behavior changed. preview-error.txt is retained untracked and unread.

## Commit/push/CI record

Only two Wrangler configs and reviewed release documentation are staged; no source/tests/workflow/package/schema/SQL/SQLite/credential/private evidence or preview-error.txt. The existing .github/workflows/test-linux.yml runs on pushes to dev/smartfleet-batch-1; config paths are not ignored, so this configuration commit triggers Ubuntu24.04/Node24 npm ci/build/typecheck/test. The separate deploy workflow is workflow_dispatch only and is not called by the test workflow.

At creation of this commit, its future SHA and CI result are PENDING, not PASS. After push, verify the exact resulting commit SHA against the workflow run head_sha, branch/path and job runtime/logs. Store final exact-SHA CI evidence in ignored .qa/PROD_1F_FINAL_REPORT.json and the task response; do not claim a prior commit's CI or make an untested follow-up HEAD appear tested. No need to modify the workflow to trigger tests. Overall release remains NOT_READY until actual rollback/fallback and fresh remote settings gates pass even if Linux CI succeeds.

References: [Policy v1.2](AUTOMATIC_PERSON_V1_2.md), [PROD-1C configuration/backup gates](PROD_1C_CONFIGURATION.md), [Cloudflare rollback behavior/limitations](https://developers.cloudflare.com/workers/versions-and-deployments/rollbacks/).
