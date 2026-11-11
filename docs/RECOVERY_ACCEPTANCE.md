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
