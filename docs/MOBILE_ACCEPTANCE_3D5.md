# Task 3D.5 — Mobile UI & Real Browser Acceptance

Development/offline only; owner Policy v1.2 preserved. Baseline dev HEAD131dc9fdc0c6b9aed99366da96fb2cf0c57bb6e4 includes implementation ae6274d. D:\\smart-fleet had no tracked edits (untracked preview-error.txt left untouched); work isolated in a clean Development clone. AGENTS/architecture/roadmap/progress/test/local-preview/v1.2 guides read. All measurements use real local synthetic Worker and Edge157.0.4341.42 on Windows Node24.22.1. Local Preview's STAGING/DEMO labels denote existing synthetic build/marker, not a deployment.

## Reproduced baseline defects and scoped fixes

| Evidence before editing | Change | Regression |
| --- | --- | --- |
| Dashboard refresh36×44 at360/390;43×18 at768/1280 | Scoped screen tap minimum44px, including refresh/logout/actions | Actual bounding boxes at all4 widths; after probe has no undersized controls in measured dashboard/dialog |
| Logout16×25 at768/1280; dialog close40×40; manage-car30px high |44×44 minimum; header inset80px to keep close focus ring clear of title | Close/title non-overlap assertion, tap and landscape screenshots |
|409 error focus assertion failed: modal effect reran on busy and stole focus from error | Focus setup/restore runs on modal change; current busy/uncertain read through ref for Escape lock | Error receives focus; filled intent retained; Shift+Tab/Tab trap; Escape/cancel/restore; busy/unknown cannot Escape |
| Trip table wrapper had no explicit keyboard target/region name | tabindex0 + Thai region label; local scroll containment/inset focus ring |768/1280 table focus; no global horizontal scroll |
| Admin Members note incorrectly said Person linking unavailable/new signup account-only | Thai copy reflects immediate new Person and restricted historical unlinked case | Existing permissions/actions unchanged; v1.2 actual signup and legacy fixtures exercised |

Basic dashboard/form baseline already fitted all4 widths; do not claim a pre-existing page-wide overflow. Existing mobile nav/cards/forms were reused, not replaced. Defensive long-text wrapping/min-width fixes are screen-only; no report-canvas geometry, fuel prices, role/account/backup format, auth/API/storage/Worker/schema/transaction change. + icon with บันทึกใช้รถ and คืนรถ names unchanged. Focus ref does not weaken busy/uncertain Escape lock.

## Actual browser matrix

| CSS viewport | New User end-to-end | Admin | Legacy Employee | Keyboard/errors/recovery | PDF |
| --- | --- | --- | --- | --- | --- |
|360×900 | PASS | PASS | PASS | PASS | PASS |
|390×900 | PASS | PASS | PASS | PASS | PASS |
|768×900 | PASS | PASS | PASS | PASS | PASS |
|1280×900 | PASS | PASS | PASS | PASS | PASS |

New tests/mobile-acceptance-browser.mjs is one optional browser suite with4 viewport scenarios, not an invented aggregate case count. Each scenario uses a fresh RAM SQLite/Worker, external browser requests blocked, zero external attempts/page errors. Covers password5-character refusal preserving input; signup→Thai success→profile/logout/login; new v5 eligibility;44px targets; focus/trap/Escape/cancel;800×390 checkout dialog/footer and report landscape checks; long Thai project/destination/name; numeric/date fields;409 with retained intent/error focus; delayed/double submit; real receipt only; occupied car visible to another actor without other-owner trip; immutable User departure fields; committed-but-lost return response→unknown/no false success→reload→read-only lookup of same operation without POST/reissued ID; own-only history/PDF; authorized Admin account edit/session invalidation, car model edit, Maintenance plan/completion/history with synthetic cost; legacy Employee actual checkout/return; old unlinked still restricted; User401 expiry UX and unchanged own records.

Existing session-recovery-browser.mjs also PASS1280/360/390 against this implementation:15s timeout, pre-send/network/lookup failure, multi-tab CAS, reload no-resubmit, inactive-Person return, logout/expiry. Its coverage does not imply those scenarios ran at768. Automated31 suites remain mandatory, including66 provisioning cases; preview fixture test grows28→29 for explicit historical Employee isolation. Browser suite is optional because Playwright/Edge are operator-installed and are not new application dependencies.

## PDF and evidence

Downloaded actual PDFs at all4 widths, verified PDF header, rendered first pages with Poppler, inspected Thai typography/ellipsis/margins and absent unverified fuel price. Report remains one-page image-based A4 landscape; intentional longest-text ellipsis is not clipping. No PDF format/font/source changes. Screen canvas and downloaded PDF render agree on synthetic1 trip/10km/odo110→120. No claim of searchable PDF text or all arbitrary maximum-length plate/province combinations.

Committed evidence under evidence/3d5: baseline.json, after.json, acceptance.json and representative baseline/history/Admin/landscape/PDF render. Remaining per-viewport screenshots/downloaded PDFs are reproducible in ignored .qa/mobile. Evidence contains invented identities/passwords only; no real Fleet or secrets. Screenshot transition animations disabled to avoid recording a drawer mid-transition; no CSS behavior bypass. Full-page fixed-nav artifacts avoided by viewport captures.

## Reproduce offline

```powershell
npm ci
npm run build
npm run typecheck
npm test
node --experimental-sqlite tests/mobile-acceptance-browser.mjs <absolute-path-to-playwright> "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe"
node --experimental-sqlite tests/session-recovery-browser.mjs <absolute-path-to-playwright> "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe"
npm run preview:local
```

Use an already installed Playwright module; default optional path .qa/browser/node_modules/playwright. No automatic browser download/provider access. Preview127.0.0.1:8787 only, RAM-only; Ctrl+C before npm ci to release esbuild lock. Added fictional historical Employee login preview.employee / PreviewEmployee123! linked to preview-person-3; preview-person-2 remains available for historical Admin first-link. Existing Admin/User/unlinked fixtures preserved. Never use real credentials or erase an unknown-operation pointer to make a test pass.

Windows npm ci42 added/43 audited/0 vulnerabilities, build/typecheck/all31 suites PASS; exact-commit Linux evidence added to PROGRESS after push. No package/lockfile/CI/schema/auth/API/backup/ledger changes; UI3 files + local fixture/tests/docs/evidence only. Existing real-data and operation guarantees remain covered by unchanged regressions.

## Limits and next task

Physical Android/iOS/Safari, native touch keyboard/picker ergonomics, actual assistive-technology user sessions and production traffic NOT_RUN/NOT_VERIFIED. CSS viewports/keyboard/ARIA/focus checks are not a full accessibility certification; mobile drawer/further screen-reader navigation remains a targeted follow-up. Reports checked on the recorded synthetic dataset, not arbitrary layouts/printers. Live Operator/Auth/Cloudflare/D1/Initialize/Deployment remain DEFERRED; Task3D.4D-6 SKIPPED. No cloud credentials/resources, R2/Cron/QR activation, real migration, Deploy or Merge. Next: owner local usability review, then a separately scoped physical-device/accessibility acceptance task; no operational approval implied.

