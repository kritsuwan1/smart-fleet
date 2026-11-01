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
