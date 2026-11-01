# Backup testing without an R2 subscription — Task 2C.3

Cloud R2 integration is deferred. Nothing in this workflow creates buckets, starts subscriptions, deploys Workers, provisions secrets or connects to a real D1 database. R2 support in src/automatic-backup.ts remains unchanged for later review. This is a test harness, not a persistent backup service: all mock objects and SQLite databases disappear when the process exits. Existing manual SQL/JSON backups remain available; automated cloud protection is not active or verified.

## Run locally

Use Node.js 24 on branch dev/smartfleet-batch-1. No Wrangler login, Cloudflare credentials, .dev.vars file, R2 subscription or cloud configuration is required.

```sh
npm ci
npm run test:backup:offline
npm run typecheck
npm test
```

test:backup:offline builds both existing Worker variants and runs tests/automatic-backup.test.mjs. npm installation may download dependencies from the npm registry; the backup tests themselves use no Cloudflare network services. The full suite still has 13 test files; this command reuses the existing backup suite rather than duplicating it.

## Mock storage and isolated recovery

The existing bucket() fixture implements get/put/list/delete with a JavaScript Map. It checks conditional create, supports pagination and injects get/put/list/delete failures and ambiguous upload acknowledgements. It is passed as BACKUP_BUCKET only in a test-local object. Notification fetch/log/time/sleep dependencies are injected; the synthetic notify.invalid URL is intercepted by a mock fetch function. No actual webhook token or runtime environment variable is set.

The database() fixture creates a new SQLite :memory: connection per source/recovery target, using the existing schema. Its small D1-compatible adapter exercises the actual backup/restore SQL. Source payload/version must remain unchanged. Recovery requires an empty demo-marked SQLite target, preserves the full synthetic state except the rotated session key, and rejects occupied, corrupt or production-marked targets. Tests named production-source/production-worker use synthetic fixtures and compiled code only; they never use production records or connections.

Coverage includes:

- Full snapshot preservation, independent Node crypto SHA-256 verification for state and envelope, metadata/body corruption rejection.
- Daily duplicate/concurrent job guards, stale schedules, lease ownership/expiry and ambiguous upload retries.
- Exactly seven retained daily artifacts from ten valid synthetic dates, boundary deletion, paginated listing and unrelated/environment-key isolation.
- Failed uploads/read-back/integrity checks do not purge the sole previous valid backup; retention failures preserve the new verified copy.
- Bounded retries, redacted failure status/logs and mocked success/failure notification delivery.
- Restore into separate in-memory SQLite and the existing offline recovery CLI rehearsal, including full normalized-state comparison.
- Default-off behavior and repository configuration assertions: all three wrangler configs plus both backup examples contain no active cron and no enabled backup flag.

No actual provider cron status is queried. Repository inspection cannot establish whether an older deployed Worker has a schedule configured outside Git; that requires an independently authorized read-only Cloudflare review. Tests invoke scheduled() directly with synthetic events, which does not register a Scheduled Trigger.

## Future Staging D1 connection — plan only

Proposed resources: smart-fleet-staging Worker, smart-fleet-staging-db source D1, smart-fleet-recovery-db recovery D1, and later private smart-fleet-staging-backups R2. Names are proposals, not proof of resource availability or creation. Reuse config/backup-staging.example.jsonc as the sole existing staging example; do not create a second deployment path or feed it to the current deploy workflow.

After separate resource approval, record the account and two new D1 IDs in a private inventory. Check each against production IDs and against each other, and bind the Demo build's DEMO_DB only to the source staging D1. Use placeholder IDs during review. Initialize only approved empty test databases with the existing fleet_store structure and demo marker, and seed synthetic fleet/accounts/trips. No production exports or real employee data are needed. Keep the recovery D1 unbound from the normal app so readState cannot initialize main before recovery.

The actual restore helper takes a Database adapter, not a named RECOVERY_DB binding. A reviewed one-off harness must explicitly pass only the recovery database to restoreAutomaticBackupToStaging(db, artifact, 'staging'). That cloud harness is not implemented by this task. Bind no production DB or production bucket to it; verify recovery ID/marker/absence of main immediately before use. The helper's marker check alone is not an infrastructure identity guarantee. It exposes no HTTP recovery endpoint. Prefer operator-only execution; do not add a public restore route. Reject occupied targets rather than deleting their data.

## Checklist when ready for R2

- Approve subscription/billing separately after checking current Cloudflare plan, storage/operation/D1/Worker limits and expected retention volume; no price or free-tier assumption is made here.
- Resolve or explicitly review the open dependency security findings (High 3 / Low 1 at Task 2B.1). Breaking upgrades still need approval.
- Approve creation of the two isolated D1s and private staging R2, then verify IDs/account, no production bindings, public R2 access disabled and least-privilege operator access.
- Approve Staging-only secrets: APP_PASSWORD and, if used, BACKUP_NOTIFICATION_URL/TOKEN. Never reuse production credentials or store values in Git.
- Review the Demo build's hardcoded Demo QR/site URLs before any Staging user access; config names alone do not fix this. Require authenticated admin access plus separately approved access restrictions; there is no config flag that disables all admin operations.
- Implement/review the recovery-only D1 harness and run the synthetic cloud recovery drill. Validate counts, hashes, odometers, roles, session rotation and rejection of wrong/occupied targets.
- Run actual private-R2 conditional writes, read-back, pagination, retention, failure notifications and D1 integration. The mock cannot certify cloud permissions, timeout behavior, durability or billing. Windows Miniflare D1 bridge stalling from Task 2B.1 remains unresolved and is not bypassed by claiming these SQLite tests are D1 tests.
- Keep AUTOMATIC_BACKUP_ENABLED=false and crons=[] through setup. Approve any deployment separately; only after integration passes and activation is approved add UTC 0 19 * * * (02:00 Asia/Bangkok next day) and enable backup. Never add blanket seven-day R2 lifecycle expiry that can delete the final valid copy.
- Verify last-success monitoring and failure delivery, including a job killed before it can report failure. Record cloud evidence separately from mock results.

Cloud R2 integration, remote Staging D1 recovery, real webhook delivery and deployed scheduling remain NOT_RUN. See AUTOMATIC_BACKUP.md for the retained design and recovery safeguards.
