# Task 3C.2A — Blocker resolution (Development only)

Task 3C.2B update: user approved the concrete dependency experiment below. Wrangler 4.116.0 / Miniflare major 4 / sharp 0.35.5 now pass both full and production-only npm audits with zero findings, plus Windows Node 24 build/typecheck/all 16 suites including native local Worker/D1 compatibility. See [DEPENDENCY_SECURITY_REVIEW.md](DEPENDENCY_SECURITY_REVIEW.md) and PROGRESS.md for exact Linux evidence. **B1 is resolved for the tested package snapshot**; the old B1/audit/approval-required text below is the historical 3C.2A state. B2–B7 cloud identity/access/setup/containment/approval and post-deploy acceptance remain pending; no cloud action or deployment was approved/performed by this dependency task.

Date: 2026-11-01. Branch dev/smartfleet-batch-1, base d1aa6ab32680670aef99fe8182480a066669463e. Read AGENTS.md and docs. **Overall NOT_READY remains truthful.** This task fixes a Maintenance state-rollback defect and verifies existing repository controls; it does not bypass security/operational approval gates or change real resources.

## Blocker inventory and evidence

Risk ratings below describe impact/readiness, not new CVSS assessments. Unknown cloud state is not proof of an unsafe deployed system.

| Item | Risk | Evidence | Outcome / next action |
| --- | --- | --- | --- |
| B1 Dependency security gate | High | Fresh audit: Critical 0, High 3, Low 1; TEST_PLAN section 11 prohibits unresolved High at release | REMAINING BLOCKER; safe existing patches retained, breaking boundaries require explicit approval |
| B2 Cloud account/D1/Worker identity | High potential impact | Only user-supplied UUIDs/local config verified; actual Cloudflare settings/Worker existence not checked | REMAINING BLOCKER; authorized metadata verification needed. No resource creation if Worker is absent |
| B3 Staging private access/secrets/URL | High potential impact / operational gate | workers_dev=false, preview_urls=false, routes=[]; URL placeholder, actual Staging-only APP_PASSWORD/access policy unverified | REMAINING BLOCKER; separate secret/access/hostname approval and provider verification; do not open public ingress to force readiness |
| B4 Source/recovery initialization | Medium / setup gate | Synthetic SQL scripts tested in memory; remote state/initialization NOT_RUN | REMAINING BLOCKER; verify empty intended targets and approve initialization; do not overwrite occupied data |
| B5 Remote recovery and Staging UAT | Medium / post-deploy acceptance | No HTTP recovery route; explicit helper and isolated SQLite tests exist, no approved cloud adapter/drill or remote login/UAT evidence | POST-DEPLOY ACCEPTANCE PENDING; approve the plan first, execute after an explicitly approved isolated Staging deployment. Not an independent requirement to complete live UAT before the first upload |
| B6 Code rollback / first deployment containment | Medium | Runbook exists; actual prior compatible Staging version and even Worker existence unknown | REMAINING BLOCKER; verify prior version or approve first-deployment no-ingress containment plan |
| B7 Deployment/resource authorization | Required approval | Current task explicitly forbids deployment and actual resource changes | REMAINING GATE, not a software defect; separate approval only after technical gates |
| M1 Failed Maintenance operation mutates caller object | Medium, model correctness | New regression initially failed: invalid date 2026-02-30 remained in maintenancePlans after exception. Existing API fresh-state handling already prevented SQL persistence | FIXED: clone/validate/commit wrapper for every maintenance operation; invalid plans/completions/history corrections preserve complete caller state |

R2 integration and Cron are intentionally deferred, **not prerequisites** for this no-R2 Staging mode. No-R2/no-Cron startup already passes built-Worker tests. No subscription/bucket/trigger creation is requested to resolve a blocker.

The approval sequence separates pre-deployment gates from post-deployment acceptance: verify security/identity/target/access/containment and approve the isolated Staging deployment first; then execute its approved cloud integration/UAT plan. Missing remote UAT is not used as a circular demand to deploy before deployment can be approved. Production release remains a separate decision after acceptance. NOT_READY here follows the independently unresolved security/identity/setup/authorization gates.

## FIXED — Maintenance rollback/history

changeMaintenance now stages only copies of maintenancePlans/maintenanceHistory, applies the existing plan/complete/editHistory rules and commits those fields to the caller only after validation succeeds. Other Fleet fields are read-only. This extends the existing safe history-correction behavior to invalid plan creation/edit and completion as well. No schema, Fleet fields, status/recurrence/role/trip rules or successful-operation payload shape changes.

Regression evidence: before the fix an invalid plan threw but changed the input state (deep equality failed). After the fix invalid plan and negative-cost completion leave caller state unchanged; existing correction/manual-plan-override rollback, Audit, duplicate/concurrent/version, car/trip/import and backup/restore assertions still pass. This is a safe model/data-handling correction; it does not add a general DB rollback, delete history or modify stored records. All tests use synthetic fixtures/SQLite :memory:.

## VERIFIED — actual repository configuration

| File / setting | Checked value |
| --- | --- |
| config/staging-no-r2.example.jsonc | Worker smart-fleet-staging, main ../output/worker-staging.js; compiled output file exists after build |
| Source binding | DEMO_DB → smart-fleet-staging-db → f71ba325-027c-4b3f-abb2-71492493a8cf |
| config/recovery-d1.example.jsonc | RECOVERY_DB → smart-fleet-recovery-db → 5ec99f9c-4919-41f4-9bc4-c8c564a60296; no Worker entrypoint/app binding |
| Separation | Both UUIDs distinct and differ from configured Production D1; Production identifier not copied or used for a cloud call |
| Activation | No r2_buckets; backup false; cron []; workers_dev/preview URLs false; routes [] |
| URL/QR | Placeholder only; Staging SITE_URL empty, QR HTTP routes/UI disabled, known Demo/Production hosts rejected |

These are real checked-in config files with the user-provided UUIDs, not proof of cloud identity. No Cloudflare credentials/settings/DB were accessed. No production data used. Existing resource names are reused; no creation commands were run.

## Dependency audit and scope decision

Actual npm audit --json exit 1: Critical 0 / High 3 / Low 1, before and after the code-only fix. Actual npm audit --omit=dev --json exit 0: zero production-dependency findings. All affected nodes are developer tooling; High parent nodes are inherited, not three separate application CVEs.

- sharp 0.34.5: High native libvips/libheif/librsvg advisories GHSA-f88m-g3jw-g9cj, GHSA-rgj7-g3m4-5g8c, GHSA-wq5f-xc86-pv6w; includes CVE-2026-33327/33328/35590/35591 and CVE-2026-96889. Chain root → Wrangler → Miniflare → sharp/native libraries. Risk involves hostile images in tooling features, not an implemented SmartFleet image-transform endpoint.
- Miniflare 4.20260515.0 and Wrangler 4.92.0 inherit High via sharp; Wrangler additionally inherits nested esbuild Low. Native Worker fetch is not this Node tooling path.
- Nested esbuild 0.27.3: Low GHSA-g7r4-m6w7-qqqr, Windows dev-server file read. Direct app build esbuild is already patched at 0.28.1. The advisory range >=0.27.3 <0.28.1 also covers available 0.27.4/0.27.5/0.27.7, so a patch-only bump within 0.27 would not clear it.

No newly verified non-breaking patch-only remediation closes these remaining findings. Existing esbuild-direct/undici/ws fixes from Task 2B.1 are retained. Do not run audit fix --force or install the audit's Wrangler 4.156.0 recommendation blindly: its transitive Miniflare 5 beta crosses a major boundary. Registry metadata was freshly rechecked read-only for the candidate below.

The prior Task 2B.1 user instruction explicitly required approval for Breaking Changes. Numeric major=0 does not remove that boundary: [sharp 0.35.0](https://sharp.pixelplumbing.com/changelog/v0.35.0/) documents API/install/runtime changes, and [esbuild 0.28.0](https://github.com/evanw/esbuild/releases/tag/v0.28.0) explicitly describes its fallback-download/integrity transition as a breaking release. Neither nested boundary was overridden as an assumed safe patch during this task. No manifest/lockfile/dependency change or new vulnerable package installation occurred.

### Concrete upgrade proposal — approval required before applying

Candidate: Wrangler 4.92.0 → 4.116.0, retaining Miniflare major 4 (4.20260730.0), workerd major 1 and Node 24; parent supplies esbuild 0.28.1 and ws 8.21.0. Its exact sharp 0.35.2 still needs patch 0.35.5, and undici 7.28.0 needs 7.30.1. Replace the old Miniflare-scoped overrides with the new exact parent scope:

```json
{
  "devDependencies": {"wrangler": "4.116.0"},
  "overrides": {
    "miniflare@4.20260730.0": {"sharp": "0.35.5", "undici": "7.30.1"}
  }
}
```

This is a proposed manifest fragment, not a replacement package file or an applied edit. It avoids Miniflare major 5 but explicitly includes the pre-1.0 breaking boundaries above. Review upstream API usage, test native sharp processing and offline Wrangler/Miniflare Worker/D1 behavior on Windows/Linux Node 24, rerun full npm ci/audit/build/typecheck/tests and CI, and verify production lock entries unchanged. Do not use real credentials/R2/Cloudflare resources for that test. Audit zero and tool compatibility are acceptance conditions to verify after approval, not guaranteed outcomes.

## Initialization and rollback plans retained, not executed

STAGING_READINESS.md remains the initialization plan: verify exact user UUIDs/account/empty target, source marker+synthetic main via existing-schema empty-only insert, recovery marker only; no live schema initialization or data command authorized here. Stop on occupied targets; no deletes/relabels/import of real cars or employees. Existing example scripts and SQL schema files remain unchanged.

FINAL_STAGING_CHECK.md remains the deploy/code-rollback draft: dedicated Staging config/name only, verify prior compatible Staging version and unchanged bindings, preserve disabled ingress/R2/Cron, never treat Worker rollback as D1 restoration. No previous version means stop for a containment plan; do not delete a Worker or overwrite a database to manufacture rollback. No Production config, default deploy target or Demo/Production workflow is used. Recovery is only into the isolated empty recovery D1 with synthetic data and separate authorization. No command in those cloud-operation drafts was executed.

## Actual checks

Windows x64 / Node v24.22.1: npm ci PASS (44 packages); build PASS (Demo 997247 / Production 995873 / Staging 996020 bytes); typecheck PASS; npm test PASS all 15 suites. Optional Edge 156.0.4314.58 local Dashboard/history correction/double-submit checks PASS at 360px and wider layouts. Browser identities are injected; remote authentication/cloud IAM and physical devices are not certified. No lint script exists. Dependency-script warnings are unchanged; no approvals altered. Prior Linux CI 41287183708 passed current baseline executable files; new fix's exact Linux commit/run result is recorded in PROGRESS.md after publication.

## REMAINING BLOCKERS / approvals

NOT_READY. Obtain explicit approval for the concrete dependency breaking boundaries, then close B1 through verified audit/tool tests. Obtain separately authorized read-only provider metadata verification for B2; this session has no Cloudflare connection and cannot certify it from files. Separately approve existing-D1 initialization, Staging-only secrets/private access and containment for the pre-deploy gates. Approve the recovery drill/UAT plan for execution after the isolated deployment, not before it exists. Deployment and any missing Worker creation require independent authorization; neither is inferred. None of these approvals is satisfied by this report or passing offline tests. No R2/Cron activation is needed or approved.
