# SmartFleet - Development Progress

## 2026-11-01 - Batch 1: Phase 0 test portability fix

- Repository: kritsuwan1/smart-fleet.
- Development branch/base only: `dev/smartfleet-batch-1` at [fee38fc5a61f574da401fc7ceda9f07408f63173](https://github.com/kritsuwan1/smart-fleet/tree/fee38fc5a61f574da401fc7ceda9f07408f63173).
- Status: Windows automated validation PASS; Linux execution NOT_RUN.
- This development branch did not contain AGENTS.md or docs/. Before implementation, read AGENTS.md and all four documents (ARCHITECTURE, PROGRESS, ROADMAP, TEST_PLAN) from the Phase 0 documentation snapshot [7cdceab](https://github.com/kritsuwan1/smart-fleet/tree/7cdceab7dc4724df6ddbc2f88f3645158b12baa1). Those documents were reference material only; no branch merge or source cherry-pick was performed.
- Created this progress file on the development branch to record this task. The separate documentation branch's Phase 0 report remains unchanged.

## Reproduced failure and cause

Reviewed package.json, its build/typecheck/test scripts, build.mjs and the dynamic imports in tests/. The test script runs 12 files sequentially with `&&`; the SQLite tests use Node's experimental SQLite support.

Before changes, install/build/typecheck passed. Full `npm test` passed worker.test.mjs then stopped at import.test.mjs. Running reports.test.mjs separately reproduced the same error:

```text
ERR_UNSUPPORTED_ESM_URL_SCHEME
On Windows, absolute paths must be valid file:// URLs.
Received protocol 'c:'
```

Both suites bundle temporary ES modules, then call `import(tmp + '/module.mjs')`. A Windows drive path is interpreted as a URL with scheme c:, not a file URL. This is test-loader portability, not an import business-rule or report-calculation failure.

## Changes

| File | Change |
| --- | --- |
| [tests/import.test.mjs](../tests/import.test.mjs) | Convert all three temporary module paths through `pathToFileURL(join(...)).href` before dynamic import |
| [tests/reports.test.mjs](../tests/reports.test.mjs) | Apply the same conversion to all four temporary module imports |
| docs/PROGRESS.md | Record baseline, changes, results, limits and next work |

Both test suites now create temporary directories containing a space, # and %. Existing assertions run from these directories to exercise URL encoding as well as Windows drive letters. No assertions were removed, skipped or weakened.

No package.json, lockfile, application source, schema, fixtures, environment variables or deployment workflow changes were needed. The standard node:url conversion supports native Windows and POSIX paths; actual Linux execution is still required for platform acceptance.

## Commands and results

Environment: Windows PowerShell, Node v24.22.1. npm is not on the host PATH, so npm commands were invoked through `pnpm.cmd dlx npm ...`; no PATH or other environment variable was changed. Dependency installation reported blocked dependency install scripts; esbuild nevertheless built both variants and all tests completed successfully.

| Command | Before fix | After fix |
| --- | --- | --- |
| `npm ci --no-audit --no-fund` | PASS, exit 0 | PASS, exit 0, 44 packages installed |
| `npm run build` | PASS, exit 0 | PASS, exit 0; Demo 957895 bytes, Production 956526 bytes |
| `npm run typecheck` | PASS, exit 0 | PASS, exit 0 |
| `npm test` | FAIL, exit 1 at import.test.mjs | PASS, exit 0; all 12 suites completed |
| `git diff --check` | PASS | PASS |
| Lint | No lint script available | No lint script available |

After editing the tests, repeated the complete install -> build -> typecheck -> test sequence; it exited 0.

| Test file | Final result |
| --- | --- |
| worker.test.mjs | PASS |
| import.test.mjs | PASS |
| accounts.test.mjs | PASS |
| roles.test.mjs | PASS |
| reports.test.mjs | PASS |
| system-status.test.mjs | PASS |
| backup-alerts.test.mjs | PASS |
| environments.test.mjs | PASS |
| mobile-ui.test.mjs | PASS |
| history-ui.test.mjs | PASS |
| profile-ui.test.mjs | PASS |
| trip-receipt.test.mjs | PASS |

Import assertions now execute, including 31-row/1765 km planning, preservation/conflict checks, repeat-import behavior, validation and API atomicity. Report assertions execute, including September 15 trips/857 km, monthly/car/employee scope, PDF geometry/xref and mocked fuel-source behavior.

All Worker/API requests were direct local function calls using in-memory SQLite and test fixtures. SQL restore tests affected only isolated in-memory databases. The optional external XLSX fixture path was not supplied; its conditional ZIP-fixture check was not executed. No browser/device UAT or real D1 restoration is claimed.

## Outstanding and next work

1. Run the same install/build/typecheck/test sequence on Linux Node 24 in a test-only environment. This Windows host has no installed WSL/Linux runtime. Do not trigger the existing deployment workflow just to run tests: it continues to deployment after checks.
2. Preserve this all-green Windows baseline when implementing the next Batch 1 backup/security work.
3. Continue scheduled-backup/retention/status/notification design and isolated staging restoration; then mobile browser UAT, as identified in Phase 0. Those features were not implemented in this task.

## Safety and scope

- No production access, remote database changes, schema changes or historical data changes.
- No secrets or environment-variable changes.
- No deployment, deployment-script execution or merge into main.
- Only the two test files and this progress file are part of this change.

## 2026-11-01 - Task 1.1: Linux Node.js 24 environment check

- Checked only repository kritsuwan1/smart-fleet and branch `dev/smartfleet-batch-1`, remote head `4deee9517407e6b63919e41ad30760157ec9067d`.
- Read this progress document before investigation. AGENTS.md is still absent on this branch (GitHub contents lookup returned 404); the previously read instructions remain the reference, without importing files from another branch.
- Actual host: Microsoft Windows 10.0.26200, win32/x64; actual Node.js: v24.22.1, obtained from the bundled Node executable using process.platform/process.arch/process.version.
- WSL executable exists but `wsl --list --quiet` reports WSL is not installed. Docker and Podman commands are unavailable.
- The required Linux environment is unavailable. Under task item 4, no Linux install/build/typecheck/test execution is claimed, and no CI workflow was added or triggered before presenting a proposal.
- Current Linux results for **all 12 suites** (worker, import, accounts, roles, reports, system-status, backup-alerts, environments, mobile-ui, history-ui, profile-ui, trip-receipt): **NOT_RUN**, not PASS or FAIL. The Windows PASS results above belong to the preceding task and are not Linux evidence.

### CI inspection and proposal - awaiting user approval

- The branch contains only `.github/workflows/deploy.yml`. It uses ubuntu-latest with Node 24, but successful tests continue into Cloudflare metadata access, Wrangler deployment and login-page checking. It has no test-only input, so it was not dispatched.
- GitHub Actions runs filtered to this branch returned total_count 0 at inspection time. No existing branch run can substantiate Linux results.
- Proposed new file: `.github/workflows/test-linux.yml`, a separate test-only workflow triggered by pushes to `dev/smartfleet-batch-1`, with an explicit matching branch guard. A branch push trigger allows execution without adding workflow files to main.
- Proposed job: ubuntu-24.04, read-only contents permission, checkout with persist-credentials false, setup-node 24, then print OS/Node version and assert Linux plus Node major 24; run `npm ci`, `npm run build`, `npm run typecheck`, `npm test`.
- It would contain no Cloudflare steps, Wrangler command, secrets references, custom environment variables, database bindings, deployment or merge operation. Existing deploy.yml would remain unchanged.
- After approval: commit only the new test workflow on this branch; observe the push-triggered run; record runner OS, exact Node version, tested SHA, run URL and actual per-suite results here. Investigate only compatibility failures if any occur.
- This entry records observed environment and CI capability only. Workflow creation/execution awaits the user's review under task item 4. No application/test logic, production, remote DB, secrets or environment variables changed. Automatic Backup work was not started.


## 2026-11-01 - Task 1.1: Approved Linux CI setup

- User approved a test-only GitHub Actions workflow on `dev/smartfleet-batch-1`.
- Inspected both branch heads before editing: development `f813c21b51a8b0c4f30b7884681fd8eb93d7565e`; documentation source `7cdceab7dc4724df6ddbc2f88f3645158b12baa1`.
- Development contained only docs/PROGRESS.md among the five required instruction/document files. Copied missing AGENTS.md, docs/ROADMAP.md, docs/ARCHITECTURE.md and docs/TEST_PLAN.md unchanged from that documentation snapshot. Read all five before implementation. Existing development progress and the newer Windows test fixes are preserved; no merge was performed.
- Added `.github/workflows/test-linux.yml`: push trigger only for this branch, repository/ref job guard, Ubuntu 24.04, Node.js 24, contents:read permission and checkout without persisted credentials.
- Workflow prints actual runner OS, architecture, Node/npm versions and commit SHA, asserts Linux/Node major 24, then executes npm ci, npm run build, npm run typecheck and npm test.
- Documentation-only pushes (docs/** and AGENTS.md) are ignored so recording results does not start redundant runs. Changes to the workflow itself trigger validation.
- No deployment/workflow-dispatch step, Cloudflare credential reference, custom environment variable, real DB binding or resource creation is present. Existing deploy.yml is unchanged.
- Copied architecture/test-plan status sections are the historical Phase 0 snapshot; this development progress file is the current execution record.
- Linux execution status at workflow preparation: **NOT_RUN** for install/build/typecheck and all 12 suites. A later entry will record the actual GitHub Actions result if available.
- Automatic Backup development has not started.

- Pre-commit validation: PyYAML 6.0.3 parsed the workflow successfully; structural checks passed for branch trigger, job guard, Ubuntu/Node version, read-only permissions, credential persistence disabled, absence of custom env/secrets/reusable-workflow calls, and the four exact npm commands. git diff --check passed. Validation dependency was installed only in ignored .qa/, not application dependencies.

## 2026-11-01 - Task 1.1: Linux CI verified PASS

- Actual run: [Test Linux Node.js 24 #1](https://github.com/kritsuwan1/smart-fleet/actions/runs/41270976878), job [test](https://github.com/kritsuwan1/smart-fleet/actions/runs/41270976878/job/124743510780).
- Tested commit: `4ecfd46909ddb7a2f69d94b7bbf95152eaba6b36` on `dev/smartfleet-batch-1`; event: push. Workflow setup commit adds the four missing instruction/docs files and preserves existing progress.
- Actual runner: **Ubuntu 24.04.5 LTS**, ubuntu-24.04 image, Linux x64. Actual **Node.js v24.22.1**, npm 11.19.1; version/platform assertions passed.
- Execution recorded in logs: 2026-11-01 10:54:18–10:54:35 Asia/Bangkok (03:54:18–03:54:35 UTC). Run and job conclusions: **success**.
- Linux results supersede the earlier NOT_RUN status; the host running this chat remains Windows, but the tests below executed on GitHub's Linux runner.

| Command | Actual Linux result |
| --- | --- |
| npm ci | PASS; 47 packages installed, exit 0 |
| npm run build | PASS; Demo 956847 bytes, Production 955478 bytes, exit 0 |
| npm run typecheck | PASS; exit 0 |
| npm test | PASS; all 12 suites reached their success output, exit 0 |

| Test file | Actual Linux result |
| --- | --- |
| worker.test.mjs | PASS |
| import.test.mjs | PASS |
| accounts.test.mjs | PASS |
| roles.test.mjs | PASS |
| reports.test.mjs | PASS |
| system-status.test.mjs | PASS |
| backup-alerts.test.mjs | PASS |
| environments.test.mjs | PASS |
| mobile-ui.test.mjs | PASS |
| history-ui.test.mjs | PASS |
| profile-ui.test.mjs | PASS |
| trip-receipt.test.mjs | PASS |

- Inspected the job steps and decoded logs, including all 12 success outputs and the Linux/Node assertion, rather than inferring success from YAML alone. GitHub accepted and executed the workflow.
- Tests use in-memory SQLite and fixtures; no production DB access or staging-D1 restore is claimed. Optional external XLSX-fixture coverage remains conditional and was not configured.
- npm ci additionally reported **6 dependency vulnerabilities (1 low, 5 high)** and warnings for dependency install scripts. Build and tests still passed. No npm audit fix or dependency upgrade was performed; audit details/remediation require a separate scoped review.
- The runner warned that actions/setup-node@v4 targets deprecated Node 20 internally and was forced to Node 24; the actual project runtime was verified as v24.22.1. This warning did not fail the run.
- No source, test assertions, schemas, real databases, Cloudflare resources, secrets or environment configuration were changed. No deploy workflow was dispatched, no deployment or merge occurred.
- The Linux automated-test prerequisite is now satisfied for the tested commit. Automatic Backup implementation has **not** started; this task ends with CI setup and evidence only.
- This result entry is a documentation-only follow-up commit; docs/** path filtering prevents a redundant CI run for that update.
