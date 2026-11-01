# Task 3C.2 — Final Staging pre-deployment check

Date: 2026-11-01. Repository kritsuwan1/smart-fleet, branch dev/smartfleet-batch-1, reviewed HEAD 8d3fb39303bf7571183e566a3e10662aad469b98. AGENTS.md and existing docs reviewed. **Decision: NOT_READY.** Risks were reported before proceeding with this documentation-only report. No deploy, rollback, initialization, secret/resource/config activation or cloud query was executed.

## PASS / FAIL matrix

| Check | Result | Evidence and boundary |
| --- | --- | --- |
| Latest Staging config | PASS locally | staging-no-r2.example.jsonc parses; main=worker-staging.js, DEMO_DB, dedicated name, disabled ingress |
| Source D1 ID | PASS locally | f71ba325-027c-4b3f-abb2-71492493a8cf matches user's smart-fleet-staging-db mapping |
| Recovery D1 ID | PASS locally | 5ec99f9c-4919-41f4-9bc4-c8c564a60296 matches user's smart-fleet-recovery-db mapping; operator RECOVERY_DB only |
| Separation from Production | PASS in repository | Both IDs differ from each other and configured Production ID; Worker smart-fleet-staging differs from Production name. Production ID is not reproduced or used for a cloud operation |
| Actual provider identities / Worker existence | NOT_VERIFIED — blocker | No Cloudflare metadata/credential connection; repository values cannot certify account ownership or live bindings |
| R2 required at startup | PASS locally | Staging has no r2_buckets; backup=false returns before bucket access; built-Worker tests work with no bucket |
| Cron / Scheduled Trigger | PASS in repository; provider NOT_VERIFIED | crons=[] and backup=false; a compiled scheduled handler is not a registered trigger. No provider state queried or activated |
| Admin endpoints | PASS in code/tests | Existing authenticated sessions, server role revalidation, same-origin writes; maintenance/system-status/backup endpoints are Admin restricted; Employee write denial/history redaction tested. Actual private-host/access/secret setup NOT_RUN |
| Recovery endpoint | PASS for current non-exposure | No HTTP restore route; recovery DB not bound to app. Offline helper checks explicit staging target/demo marker/empty main. Cloud operator adapter/IAM and remote recovery remain NOT_RUN |
| High security findings | FAIL — deployment blocker | Fresh audit exit 1: Critical 0, High 3, Low 1; details below |
| Initialization plan | PASS as offline design | Existing fleet_store structure, single empty-only synthetic source insert, marker-only recovery; SQLite rerun/occupied-target tests pass. Real initialization NOT_RUN / not approved |
| Build/typecheck/tests/Linux | PASS for latest executable/config SHA | Run 41287183708 succeeded on 1578e517341da6565b32b8371e8035d2ee93b18f, all 15 suites. Current reviewed HEAD differs only in PROGRESS.md |
| Staging URL and QR | PASS for no handoff; access pending | URL is a placeholder, QR routes/UI disabled, known Demo/Production hosts rejected. workers_dev=false, preview_urls=false, routes=[]; no usable authorized Staging URL yet |
| Deployment/rollback runbook | DRAFT ONLY | Commands below are review text and must not be executed while NOT_READY |

## Security blocker decision

Fresh npm audit --json was run read-only during this review and still reports High 3 / Low 1. High package nodes are sharp 0.34.5 and its inheriting miniflare/wrangler parents; Low is Wrangler's nested esbuild 0.27.3. All are development/tooling dependencies; this is not evidence of three independent deployed application vulnerabilities. However, deployment uses Wrangler and the repository's TEST_PLAN.md section 11 requires no unresolved Critical/High before proposing a release. **Treat these High findings as a Staging deployment blocker under the current acceptance policy; no exception is assumed.**

Minimal proposed upgrade remains the separately reviewed stable Wrangler/Miniflare major-4 path plus patched sharp/undici. Sharp's 0.35 boundary has explicit breaking changes, so no upgrade/override was applied. Do not use audit fix --force. Resolve through the approved dependency task, rerun audit/build/typecheck/all tests and review toolchain behavior before reconsidering readiness. Full GHSA/CVE/chains are in DEPENDENCY_SECURITY_REVIEW.md and STAGING_READINESS.md.

## Tests checked, not silently rerun

Latest Linux [run 41287183708](https://github.com/kritsuwan1/smart-fleet/actions/runs/41287183708), job 124790751198: Ubuntu 24.04.5 LTS, Linux x64, Node v24.22.1. npm ci/build/typecheck/npm test steps all success. All 15 suites reached success output, including maintenance correction/rollback and no-R2 Staging checks. Linux build sizes: Demo 995815 / Production 994441 / Staging 994588 bytes. Compared tested SHA 1578e517341da6565b32b8371e8035d2ee93b18f with reviewed HEAD 8d3fb39303bf7571183e566a3e10662aad469b98: only PROGRESS.md changed. Thus these results apply to the current executable/config snapshot; no fresh build/test run is claimed for this documentation-only review. Local JSONC, exact user ID mapping, different-from-Production and disabled activation guards were checked again offline.

## Required gates before any future deployment command

1. Close the security blocker; retain a tested/pinned toolchain and explicit Staging-only deployment approval. No implicit waiver or Production approval.
2. Verify the account, existing source/recovery D1 names/UUIDs and actual Worker identity through separately authorized metadata access. Verify whether smart-fleet-staging already exists. If it does not exist, STOP: deploy can create a Worker, which would require additional explicit resource-creation authorization and is forbidden in this task. Do not create it as an unspoken prerequisite.
3. Review existing Worker settings/bindings/routes/triggers/secret presence and last known-good Staging version privately. Confirm there is no Production binding, R2 requirement, Cron, inherited public route or Production credential. Do not print secret values.
4. Separately approve initialization of the existing isolated databases with only synthetic data, using the reviewed plan in STAGING_READINESS.md. No migration of Production or existing records; no automatic erase/relabel/replace. Keep recovery unbound from ordinary app startup.
5. Approve Staging-only APP_PASSWORD and private hostname/access controls through a separate task; this task supplies no secrets or URL. Review whether code deployment with all ingress disabled or an access-controlled test URL is authorized. Do not turn workers_dev, preview URLs or routes on just to make a smoke check succeed.
6. Confirm a prior compatible Staging version exists for rollback, or explicitly approve a first-deployment containment/recovery plan. Keep R2/cron off. Record commit, artifact hash, config hash, account, target IDs, previous version and test evidence before execution.

## Deploy command draft — DO NOT RUN

All lines here are documentation only. Do not execute even the metadata/deploy/rollback commands in this task. After the gates above and separate authorization, copy the reviewed Staging config to .qa/staging.review.jsonc. That path retains the same ../output/worker-staging.js entrypoint. Recheck name smart-fleet-staging; DEMO_DB points only to f71ba325-027c-4b3f-abb2-71492493a8cf; no recovery binding/R2/crons; ingress remains disabled unless separately reviewed/approved. Never pass the recovery config, a Production config, a bare default config, or the existing Demo/Production deploy workflow.

Reproducibility checks in the future approved checkout:

```text
git branch --show-current
git rev-parse HEAD
npm ci
npm run build
npm run typecheck
npm test
```

After security remediation, verify the exact pinned Wrangler supports these command options again. Use the locally installed CLI, not a downloaded latest version. Under approved Staging-only operator credentials, metadata/version inspection and the Staging-only deployment draft are:

```text
npx --no-install wrangler deployments list --config .qa/staging.review.jsonc --name smart-fleet-staging
npx --no-install wrangler deploy --config .qa/staging.review.jsonc --name smart-fleet-staging
npx --no-install wrangler deployments list --config .qa/staging.review.jsonc --name smart-fleet-staging
```

No force/yes flag or Production target is supplied. Existing root wrangler/deploy.yml is not used. Deployment syntax was reviewed against installed Wrangler 4.92.0 command definitions and the [official Workers command documentation](https://developers.cloudflare.com/workers/wrangler/commands/); this does not authorize use of the currently vulnerable toolchain.

## Future verification after an explicitly approved deploy

- Check deployment output/account/Worker name/version and actual DEMO_DB UUID; compare to approved manifest. Verify no recovery binding, R2 or registered Cron. A code upload alone does not establish correct cloud configuration.
- With ingress still disabled there should be no public app endpoint; record that outcome rather than inventing a URL. Only if a separate private URL/access policy has been approved, verify its TLS/hostname before visiting it; never substitute Demo/Production. Confirm STAGING banner and synthetic-only data, missing/invalid login rejection, Admin access, Employee direct API write denial/history redaction, service/history correction and stale-write behavior. Do not place session cookies or backup bodies in public command/log artifacts.
- Confirm /qr, /qr-site.svg and /qr-car.svg stay disabled (404). Review logs for safe errors and data/permission failures. Never activate R2/Cron as part of smoke testing. Real provider metadata/session/IAM checks are currently NOT_RUN.

## Rollback draft — DO NOT RUN

Worker rollback is a code/version operation and is not a D1 data restore. Check previous version compatibility and resource bindings first; do not select a version with Production bindings, changed data assumptions or missing resources. [Cloudflare rollback documentation](https://developers.cloudflare.com/workers/versions-and-deployments/rollbacks/) describes these limits.

Only after identifying the exact previous **Staging** version and receiving separate rollback authorization:

```text
npx --no-install wrangler rollback REPLACE_PREVIOUS_STAGING_VERSION_ID --config .qa/staging.review.jsonc --name smart-fleet-staging --message "Staging-only validation rollback"
npx --no-install wrangler deployments list --config .qa/staging.review.jsonc --name smart-fleet-staging
```

Keep interactive review enabled; do not auto-accept an inferred version. Recheck bindings, private access, QR, role restrictions and that R2/Cron remain off. Do not restore D1, overwrite history/trips, delete Worker/resources or reset secrets to perform code rollback. If there is no prior version or the rollback is incompatible, stop and retain the no-ingress posture while requesting a reviewed containment/recovery plan. Any recovery rehearsal must use only the isolated recovery D1 with synthetic data and independent approval; no automatic overwrite of even the source Staging DB is authorized here.

## Final disposition

NOT_READY: security gate FAIL; cloud identities/Worker existence and authorized access setup NOT_VERIFIED; real initialization/recovery/UAT NOT_RUN; no deployment or resource-creation authorization. This task changes only documentation. No source/config/schema/dependency/environment/secret/real-data change, resource creation, R2/Cron activation, Deploy, Rollback or Merge.
