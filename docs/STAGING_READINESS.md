# Task 3C.1 — Staging readiness (NO DEPLOY / NO R2)

Development branch: dev/smartfleet-batch-1. Base: 346f4db7be6f7fee3755b68ea81d562a9cd4b4b9 (includes Task 3B). Prerequisite [Linux run 41283265689](https://github.com/kritsuwan1/smart-fleet/actions/runs/41283265689), job 124779346094 succeeded on this exact SHA: Ubuntu 24.04.5, Node 24.22.1, npm ci/build/typecheck/all 14 suites PASS. Logs were inspected. Task 3B history-edit gap is addressed below; historical review findings remain in MAINTENANCE_STAGING_REVIEW.md.

## Current readiness

| Item | Status |
| --- | --- |
| Admin history correction with preserved before/after Audit | PASS in synthetic tests; no new Fleet fields or SQL schema |
| Safe recalculation / rollback on failed validation or conflict | PASS in SQLite; later manual thresholds cannot be overwritten |
| Separate Staging Worker build / no production QR handoff | PASS; Staging QR HTTP routes/UI disabled, known Demo/Production hosts rejected |
| No-R2 / no-cron / no-public-route config prepared | PASS as example configuration only |
| Synthetic source/recovery initialization | PASS on SQLite; remote execution NOT_RUN and not authorized |
| Admin/Employee access and maintenance regression | PASS, including built Staging Worker login/Employee write denial |
| Existing cloud D1 identity/binding confirmation | User-supplied IDs configured and locally validated; provider account/resource identity still NOT_VERIFIED |
| Dependency audit | FAIL: High 3 / Low 1 (development tooling); approval required for breaking remediation |
| Actual Staging access/secrets/remote D1 recovery/mobile UAT | NOT_RUN |
| Deployment authorization | NONE; overall NOT READY for deployment approval |

## Maintenance correction and rollback policy

Admin uses the existing action maintenance with operation editHistory, id and record {date,odometer,details,costSatang}. Employee remains denied by the existing server role guard. ID, planId and carId remain immutable. Original record/plan plus corrected values are stored in the existing Audit by fleetApi; no record deletion or trip/car odometer update occurs. The history item is corrected in place while its original survives in Audit/full-state backups.

Dates must be real Bangkok calendar dates no later than today; costs/odometers retain existing bounds. Corrections cannot reorder the plan's date/odometer history or become exact duplicates. Earlier history edits do not change the current plan. Editing the latest record's recurring date/odometer recalculates only that dimension from the corrected actual service when the current due value still equals the value derived from the original service and current interval. Otherwise the edit is rejected and the Admin must review the separately adjusted plan. Details/cost corrections do not recalculate schedules. Disabled/one-off plans stay disabled.

Validation builds a cloned candidate before assigning either history or plan; failures preserve the original in-memory state. Existing optimistic main-row version checks prevent stale SQL writes; the API Audit and corrected state persist together in the existing full-state update. This is not a general database rollback facility or permission to restore an old fleet snapshot over newer trips. SQL/automatic full-state recovery rules remain unchanged.

## Prepared configuration (do not deploy)

- config/staging-no-r2.example.jsonc: Worker smart-fleet-staging, output/worker-staging.js, DEMO_DB → existing smart-fleet-staging-db. No r2_buckets, cron [], AUTOMATIC_BACKUP_ENABLED=false, workers_dev=false, preview_urls=false and routes=[]. This intentionally exposes no public application route; a separately approved private/access-controlled hostname is needed later.
- config/recovery-d1.example.jsonc: RECOVERY_DB → existing smart-fleet-recovery-db, operator D1 metadata only. No Worker name/entrypoint, no scheduled handler or app binding. The restore helper takes an explicit Database adapter; RECOVERY_DB is for a future reviewed operator adapter, not an implemented HTTP restore endpoint.
- Database IDs were supplied explicitly by the user: smart-fleet-staging-db = f71ba325-027c-4b3f-abb2-71492493a8cf; smart-fleet-recovery-db = 5ec99f9c-4919-41f4-9bc4-c8c564a60296. They are configured with DEMO_DB and RECOVERY_DB respectively, distinct UUIDs and locally validated, not copied from Production. These IDs are resource identifiers, not credentials. Provider account/name/UUID verification is still required before use; no Cloudflare read/write or real database connection was performed.
- The user confirms no Staging URL exists. Configuration retains https://REPLACE_APPROVED_STAGING_HOST as a comment placeholder, with no public routing. A possible URL shape after a separately approved deployment is https://smart-fleet-staging.<CONFIRMED_WORKERS_SUBDOMAIN>.workers.dev; this is not assigned, reachable or approved here. Confirm the actual account/subdomain and access policy, then use the verified deployment output for any later URL/QR proposal. workers_dev remains false; no URL/domain is reserved or activated.
- Staging compiles separately via __FLEET_ENV__=staging; it uses DEMO_DB plus the existing demo environment marker for storage/backup compatibility, but displays STAGING and seeds only synthetic cars. Marker=demo alone cannot distinguish the real Demo database from Staging; independent ID validation is mandatory.
- Demo/Production builds, config files and static QR assets are retained. Staging serves no QR page/SVG and the UI shows a disabled notice; it contains no active Demo/Production QR handoff. SITE_URL is empty in Staging and ordinary application navigation is relative. Known Demo/Production hostnames are rejected by the Staging handler. Enabling Staging QR requires a separately reviewed destination/QR generation task, not a hostname substitution in existing encoded SVGs.

## Initialize existing Staging databases — plan only

The following commands are documentation, NOT executed on cloud D1. Obtain explicit approval before executing initialization (it creates the existing fleet_store table structure in an empty database and inserts synthetic rows). No migration of an existing schema is required or authorized. No production data exports/imports are used.

1. Independently verify the user-supplied UUID/name mappings above and the future intended private hostname against the correct Cloudflare account with separately authorized staging-only operator access. Never obtain/reuse a production token or secret. UUIDs are locally confirmed distinct; verify target identity before any approved remote operation without printing production identifiers into evidence.
2. Copy the two config examples to .qa/staging.review.jsonc and .qa/recovery.review.jsonc after reviewing the supplied IDs. No ID substitution is now required unless independently corrected by the user/provider metadata. Keep backup off, no R2, empty cron/public routes and the URL placeholder. Do not feed these to deploy.yml (it supports Demo/Production, not this Staging target). Review the exact resolved config and intended database name before every remote command.
3. After authorization, metadata-only checks (no creation):

```text
npx wrangler d1 info smart-fleet-staging-db --config .qa/staging.review.jsonc
npx wrangler d1 info smart-fleet-recovery-db --config .qa/recovery.review.jsonc
```

4. Verify each target is empty through approved read-only metadata/SQL inspection, then request separate initialization approval. Only then:

```text
npx wrangler d1 execute smart-fleet-staging-db --remote --config .qa/staging.review.jsonc --file config/initialize-staging.example.sql
npx wrangler d1 execute smart-fleet-recovery-db --remote --config .qa/recovery.review.jsonc --file config/initialize-recovery.example.sql
```

5. Check source has exactly environment=demo and main with SYNTHETIC-001, test people/project, empty trips/accounts/audit and a freshly generated sessionKey. Inspect counts/field presence only; do not log the key/body. The source script inserts both rows in one statement only when fleet_store is completely empty. Re-running inserts zero rows and does not overwrite anything. Recovery initialization inserts only the demo marker and no main. Do not open the ordinary app on recovery; that would initialize main. If either DB is occupied, stop rather than erase/relabel it. Existing table structure is fleet_store(id TEXT PRIMARY KEY NOT NULL,payload TEXT NOT NULL,version INTEGER NOT NULL DEFAULT 0).
6. Separately approve Staging-only APP_PASSWORD/access setup and any private host/Worker deployment. No secrets are supplied by this task and no config disables the existing Admin authorization. Leave recovery unbound from the app. A reviewed one-off recovery adapter and synthetic backup artifact are still needed for an actual remote restore exercise; offline SQLite tests do not prove that integration.
7. Only after explicit deployment approval, run synthetic Staging login/registration/role/maintenance/edit/conflict/rollback/recovery checks and mobile UAT. Keep R2/cron off throughout. This task ends before all real commands/resource/secret/deployment actions.

## Security review and safe next proposal

Fresh installed-tree npm audit --json: Critical 0 / High 3 / Low 1, exit 1. These are affected package nodes, not four independent CVEs. All affected lock entries are dev dependencies. No package or lockfile change was made.

| Node / chain | Finding | Minimal proposed remediation, pending approval |
| --- | --- | --- |
| wrangler → miniflare → sharp 0.34.5 | High; [GHSA-f88m-g3jw-g9cj](https://github.com/advisories/GHSA-f88m-g3jw-g9cj), [GHSA-rgj7-g3m4-5g8c](https://github.com/advisories/GHSA-rgj7-g3m4-5g8c), [GHSA-wq5f-xc86-pv6w](https://github.com/advisories/GHSA-wq5f-xc86-pv6w): bundled native image parsing libraries | Patched sharp >=0.35.5, but 0.35.0 has explicit breaking API/install/runtime changes; do not override across this boundary without approval/tests |
| miniflare 4.20260515.0 | High inherited from sharp | Review stable same-major parent update instead of jumping to Miniflare 5 beta |
| wrangler 4.92.0 | High inherited dependency path | Candidate previously inspected: Wrangler 4.116.0 / Miniflare 4.20260730.0, plus reviewed sharp 0.35.5 and undici 7.30.1 patches; test complete toolchain before adopting |
| wrangler → esbuild 0.27.3 | Low [GHSA-g7r4-m6w7-qqqr](https://github.com/advisories/GHSA-g7r4-m6w7-qqqr), Windows development-server arbitrary read | Parent version supplying esbuild >=0.28.1; direct project esbuild is already 0.28.1. Avoid exposing affected dev servers meanwhile |

Actual app does not import sharp/Miniflare; native Worker fetch is separate from Node tool dependencies. This limits likely exposure to developer CLI/emulator operations but is not a security clearance. The proposed parent path and exact override compatibility must be reverified in its own approved upgrade task. Do not use npm audit fix --force; do not install the registry's latest Wrangler/Miniflare 5 prerelease automatically. See DEPENDENCY_SECURITY_REVIEW.md for CVEs, chains and upstream breaking-change evidence.

## Evidence and remaining approvals

Final Windows Node 24 build/typecheck/all 15 suites pass; Staging tests run only SQLite/mocked bindings and built Worker code. Optional local Edge review passes history correction at 360px and prior width/double-submit checks with synthetic identities. Physical/mobile Safari and real Staging D1/Cloudflare integration remain NOT_RUN. Final Linux commit/run results are in PROGRESS.md.

Required approvals/input before any deploy: actual D1 UUID/private-host confirmation; breaking dependency remediation; existing-D1 initialization; Staging-only secrets and private access controls; one-off recovery adapter/remote rehearsal; and explicit Staging deployment approval. No request to create resources, enable R2 or cron is included. No production access/change, schema migration, real DB initialization, secret/environment change, deployment or merge occurred.
