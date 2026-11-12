# Recovery candidate independent acceptance checklist

Overall NOT_READY until an operator independently accepts this exact candidate. A runbook or unsigned manifest alone is insufficient.

- [ ] Compare trusted external archive SHA256 and verify.mjs allowlist/file checks; refuse modified or extra files.
- [ ] Review baseCommit + uncommitted sourceTreeSHA256; do not call it a new commit. Scoped Commit/Push is owner-authorized; verify recorded sourceCommit and exact-new-source Linux CI before release.
- [ ] Confirm Node/npm/compiler/lockfile/config pins and repeated build/ZIP equality; do not assume cross-platform byte equality.
- [ ] Independently review Worker/client/asset content: no bootstrap People/car/project/seed/QR records, credentials, SQL/SQLite or personal data. Public font/code licenses are retained.
- [ ] Confirm exact-path graph exclusions and decoded static-identity scans; generic regex checks alone are insufficient.
- [ ] Exercise actual accepted Worker with synthetic legacy/v4/v5/mixed records and User/Admin/Employee authorization/session boundaries.
- [ ] Verify missing/invalid DB/table/main/session/format never initializes, generates keys, migrates or writes; original seed import denied server-side without mutation.
- [ ] Verify all original cars/accounts/people/trips/odometer/maintenance/audit/ledger records are retained; only intended synthetic operations add/update their expected records.
- [ ] Review full atomic failure/CAS/concurrency/same-ID payload conflict/lost response/reload/return replay tests; no duplicate trip/odometer/audit/operation writes.
- [ ] Review recovery UI limitations, disabled static QR/vehicle image paths and physical/browser acceptance gaps.
- [ ] Refresh full live account/Worker/version/settings, both D1 bindings, APP_PASSWORD preservation and existing scheduled backup behavior under separate authorized read-only access.
- [ ] Verify current backup integrity/freshness and compatibility; no automatic old snapshot restore or database reset.
- [ ] Approve exact artifact/settings/action independently; owner separately authorizes execution. No deployment approval is implied here.
- [ ] Agree non-destructive post-action checks and stop/forward-fix plan. Never blindly roll back to an unverified old binary or delete/restore current data.


## PROD-1J explicit unresolved gates

- FAIL / HOLD: complete configuration/behavior preservation cannot be accepted from key-presence alone; actual placement/logpush/tail_consumers/usage_model values and scheduled purpose/expression are missing.
- NOT_VERIFIED: existing Cron behavior with new handler; definition omission preserves the trigger but the current candidate makes no automatic backup with the observed binding set.
- NOT_VERIFIED: backup freshness and compatibility at the final release point; historical verified export alone is insufficient after possible writes.
- NOT_VERIFIED: new exact-source Linux CI after local UI fix; no commit/push in this task.
- PENDING: independent operator content/runtime/policy acceptance of the regenerated candidate and final release action.

Do not restore an old D1 snapshot or delete current records to satisfy any gate. Do not change Preview URLs/Cron/R2/permissions/APP_PASSWORD without separate authorization.

## PROD-1K — D1 backup continuity (local implementation only)

Owner-approved offline implementation adds D1 scheduled backup through existing BACKUP_DB, consistent Fleet+ledger snapshot, immutable daily publication/read-back SHA-256, guarded seven-Thai-day retention, redacted status/failures and synthetic restore/replay tests. No schema/config/cloud changes. Historical daily rows are preserved; same-day collisions and old-writer overlap block cutover. Source/envelope size limits and retained legacy backlog require operator review. Normal/recovery share the D1 handler; no R2 activation. See [D1_AUTOMATIC_BACKUP.md](D1_AUTOMATIC_BACKUP.md) for limits and acceptance gates. Final local evidence follows in output/recovery; Linux/exact-new-SHA CI, live schema/control/size, placement, fresh backup and independent acceptance NOT_VERIFIED. No commit/push/deploy authorized; Production remains NOT_READY.

## PROD-1M — fix PROD-1L findings (offline, no Commit/Push)

2026-11-12 Asia/Bangkok. Scheduled normal/recovery require D1 BACKUP_DB and explicitly fail on absence; fetch/login/trip behavior remains covered by regression. Retention uses10-row BINARY keyset pages through a fixed upper watermark, advancing past legacy data with a100-page bound and explicit incomplete-retention failure; verified current snapshot and conditional delete fences retained. Schema uses table_xinfo, rejecting generated/hidden/incompatible columns. Final daily snapshot re-read plus newer successful control validation permits legitimate concurrent completion while preserving corruption/disable/failure refusal. Tests add32 cases including6 original assertions failing against frozen before-fix source and passing after fixes; existing R2 helper tests remain separate while old scheduled expectations now require D1. Packaging requires matching remediation evidence. See D1_AUTOMATIC_BACKUP.md; final full-suite/artifact results follow. Linux/live schema/settings/placement remain NOT_VERIFIED; Production NOT_READY. No real DB/cloud operations or config/credential changes; prior Maintenance edits and preview-error.txt preserved.

Final PROD-1M Windows evidence (2026-11-12 Asia/Bangkok): Node24.22.2 normal build/typecheck PASS; npm test PASS all34 suites, retaining D1 backup60, recovery34 and provisioning66 plus new remediation32 cases. All6 original regression assertions FAIL against frozen pre-fix modules/artifacts and PASS after fixes. Both actual normal/recovery artifacts tested for missing binding, retention past100 legacy rows, generated schema refusal and concurrent completion; zero external calls. Current behavior supersedes earlier PROD-1J/K no-backup/retention-gap descriptions. Full fresh ZIP checksums and acceptance report follow in ignored .qa/prod1m; source uncommitted and Linux/exact-SHA CI NOT_VERIFIED. No Commit/Push/Deploy or real DB/cloud operations. Ready-for-commit-review recommendation is offline only, not Production approval.

PROD-1M F1 status consistency: Admin HTTP backup-status also requires D1 and returns503 when configuration/schema is missing, preventing stale R2 success from being displayed. Legacy R2 status helpers remain direct offline tests only. Four additional actual normal/recovery HTTP status cases bring remediation to32; final rerun supersedes the earlier28-case evidence. No other fetch/login/trip behavior or authorization changed.

Final PROD-1M acceptance superseding intermediate artifacts (2026-11-12 Asia/Bangkok): normal build/typecheck and all34 suites PASS under Node24.22.2. Remediation32 cases PASS (including four HTTP status regressions), original6 frozen-before assertions FAIL as expected then PASS after fixes; D1 backup60/recovery34/provisioning66 retained. Admin status and scheduled handlers now consistently require D1, with explicit503 status when missing rather than legacy R2 success. Candidate01 is superseded by the final candidate02 archive/hash in the ignored PROD-1M report; preserve both without deployment. No application failures remain in the final run. Linux/exact-commit CI, real schema/control/capacity/placement/backup freshness and independent operator acceptance are NOT_VERIFIED. Offline recommendation READY_FOR_COMMIT_REVIEW; Production remains NOT_READY.
