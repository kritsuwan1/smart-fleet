# Automatic Backup - Development Design and Recovery

## Task 3D.4D-7 — v1.2 account compatibility

Automatic artifact envelope remains unchanged; shared account inspector now enforces mixed Fleet marker5 and reciprocal Account5/Person provenance before isolated restore. JSON manual export uses schemaVersion4 for marker5; legacy versions1/2/3 remain supported with corresponding strict reader. SQL guard policy matches JS; pinned prior v4 guard retained for historical exact templates/old-reader refusal. SHA-256 does not override invalid identity/schema. No cloud R2/retention/Cron settings changed, no actual backup/restore run. [Format/rollback limits](AUTOMATIC_PERSON_V1_2.md).

Task 2C.3: R2 subscription/activation is deferred. Use [BACKUP_OFFLINE.md](BACKUP_OFFLINE.md) for the existing mock storage/isolated SQLite workflow and the future Staging checklist. These tests do not establish cloud integration or operational automatic backups; all real-resource/activation steps below still require separate approval.

Task 2A implementation only. No Cloudflare resources, credentials, secrets, deployed configuration or production records were changed. Existing wrangler*.jsonc and deploy.yml remain unchanged. Both example configs are disabled, contain placeholders and have empty cron lists.

## Schedule and snapshot

- Intended schedule: 02:00 Asia/Bangkok every day; UTC cron `0 19 * * *` (previous UTC date). The scheduled handler checks this cron and returns immediately unless AUTOMATIC_BACKUP_ENABLED is exactly "true".
- Staging uses the Demo build, DEMO_DB binding and existing `environment=demo` marker. Production design uses the Production build, DB binding and requires an explicit `environment=production` marker. An absent/mismatched marker is rejected before the job writes anything. No marker is created or relabelled by backup code.
- A single SELECT reads main.payload and main.version together. The job never calls readState(), initializes main, rotates its session key, increments its version or changes historical records.
- The full Fleet state is preserved, including accounts, password hashes, salts, current session key, audit history, all cars/people/trips/projects, fuel references and unknown legacy fields. Treat every artifact as private authentication material and personal data.
- This is an application-state snapshot, not a complete D1 export. Environment markers, rate-limit/fuel-cache rows and backup operational rows are deliberately excluded.

## Private R2 and integrity

- Use separate, private buckets for Staging and Production, with no r2.dev access, public/custom-domain routes or application download route. Neither worker serves automatic R2 artifacts over HTTP. Binding names alone cannot verify bucket privacy: administrators must check actual settings during approved Staging setup.
- Keys: `fleet/v1/staging/YYYY-MM-DD.json` and `fleet/v1/production/YYYY-MM-DD.json`, dated in Bangkok. Names contain no employee, vehicle or account identifiers.
- Metadata records format/schema version, environment, backup date, actual creation time, app version, source-state version, UTF-8 state byte count and entity counts.
- Reuses existing JSON backup validation and SHA-256. One digest covers state; another covers the complete envelope including metadata and state. A read-back from R2 must pass both digests and structural/count/environment/date checks before success or retention.
- SHA-256 detects corruption, not trusted origin or confidentiality. R2 privacy/access controls and controlled artifact custody are required. Do not place artifacts or webhook URLs/tokens into Git, CI artifacts, screenshots or public logs.
- Existing valid daily objects are reused; writes use If-None-Match: * and never overwrite an existing daily object. A corrupt existing daily object is a failure requiring operator inspection, not automatic replacement.

## Concurrency, retries and retention

- Existing fleet_store stores only two operational rows per configured environment: `backup:lease:<environment>` and `backup:status:<environment>`. No schema migration/new SQL table is needed.
- Atomic D1 lease acquisition serializes jobs in the environment. Lease duration is 15 minutes, renewed before status writes, upload and retention operations. Each owner has a random token; conditional renewal/status writes/release cannot take over another owner's lease.
- An active lease skips duplicate jobs; an expired lease can be reclaimed. The immutable daily key also fences delayed R2 puts after lease loss or ambiguous network acknowledgements.
- R2 read/put/list/delete and lease acquisition retry up to three times with 100/200 ms backoff and a 10-second deadline per attempt. Webhook delivery uses an HTTPS request timeout, rejects redirects, and also has bounded retries.
- Underlying R2 requests cannot be cancelled by the deadline wrapper; a timed-out put may still finish. Its conditional create prevents overwrite; a later run reads/verifies and reuses that object.
- Retention keeps the current Bangkok backup day plus the previous six calendar days. Only strictly named older objects within this environment's prefix are deletion candidates. Listing is paginated; unrelated keys and other-environment objects are untouched.
- Retention starts only after a verified current-day copy exists. The current key is never deleted. Failed upload/read-back/integrity checks cause no purge, preserving the last valid copy even if older than seven days. Retention failure preserves lastSuccess and surfaces a failed job for retry; an existing valid daily copy is reused on retry.
- Do not add a blanket R2 seven-day lifecycle expiry: it could remove the final good backup independently of these guards. External bucket deletion, lifecycle rules and operator actions are outside the application's preservation guarantee.

## Status, logs and failure notification

- Admin-only GET /api/backup-status returns disabled/never/running/success/failed, date, sanitized error code, notification outcome and last-success metadata. BackupPanel shows status, most recent success and a refresh action. Employees receive 403; unauthenticated requests receive 401.
- Error logs contain only event name, environment, day and fixed error code. Raw exceptions, state, account details, artifact body, session key and webhook credentials are never logged by the job.
- An optional operator-provisioned BACKUP_NOTIFICATION_URL (HTTPS) and optional BACKUP_NOTIFICATION_TOKEN deliver only `event/environment/date/code`. Notifications never include raw errors or backup content. Delivery failure is logged and recorded separately; missing configuration records "unconfigured".
- The scheduled handler throws a sanitized error on failure so Cloudflare invocation status also records failure. If D1 status writes fail, the log/webhook remains the fallback. Failure before a safe environment/lease is acquired does not write into an untrusted database.
- Process termination or a cron that never fires cannot execute a catch handler. Provider invocation monitoring and an external last-success-age check are required operationally; a running status may remain until a later successful attempt. Notification delivery is at-least-once under retries, not exactly-once.

## Staging setup checklist - requires separate approval before real changes

| Setting | Staging requirement |
| --- | --- |
| Worker/build | Dedicated Staging Worker using output/worker-demo.js |
| Database | Dedicated non-production D1; DEMO_DB binding; existing schema.sql structure and demo marker; synthetic/anonymized records |
| Storage | Dedicated private Staging R2 bucket, BACKUP_BUCKET binding; public access off; no public route or unconditional expiry lifecycle |
| Mode | BACKUP_ENVIRONMENT=staging; enable flag remains false until setup is approved/validated |
| Notification | Approved HTTPS receiver; separate Staging-only webhook URL/token, provisioned securely after approval |
| Schedule | After review/approval only, enable flag and add cron 0 19 * * * to Staging |
| Restore target | A second empty recovery D1 with demo marker; never bind a Production database to the restore harness |

Review config/backup-staging.example.jsonc; all IDs/bucket names are placeholders. config/backup-production.example.jsonc documents a separate future design only. Do not feed either example into the existing deployment workflow, copy Production credentials to Staging, create resources or deploy as part of this task.

Before approving activation: verify Worker/build/environment marker/bucket bindings, no public bucket access, least-privilege account access, failure receiver behavior, exact cron time and expected counts; retain independent provider monitoring. No credentials need to be embedded in source.

## Recovery procedure - Staging only

1. Select a trusted private R2 object and record its key/date/source version/checksum through an approved private channel. Download with authorized operator access only; do not enable public URLs.
2. Run the offline rehearsal below using a synthetic/anonymized sample first. It creates only an in-memory SQLite database and prints counts/source version/checksum, never state or authentication fields:

   `node --experimental-sqlite scripts/rehearse-auto-restore.mjs PRIVATE_BACKUP.json`

3. For a real recovery exercise, separately approve/provision an isolated empty recovery D1 and verify its ID, bindings and `environment=demo` marker. Do not open the normal app first, since readState() initializes main.
4. Use a reviewed one-off D1 adapter/harness bound solely to that recovery database to call `restoreAutomaticBackupToStaging(db, text, 'staging')`. This helper validates the artifact before writing, checks the target marker again in the atomic INSERT, rejects any existing main and has no HTTP route.
5. The helper inserts the full state, rotates only sessionKey and reads back the exact inserted JSON. Password hashes/accounts/history and unknown legacy fields remain intact. Production-source and Staging-source artifacts may both be rehearsed into an empty Staging target; Production targets are always rejected.
6. Compare all entity counts, car/driver links, trip/odometer history, audit data, account roles and full normalized state excluding sessionKey to the artifact. Verify old sessions are invalid and test login/authorization in the isolated Staging app.
7. Re-running into an occupied target is intentionally refused. Do not erase/overwrite the target automatically. On a failed verification, quarantine it and request a new isolated target for investigation.
8. Record artifact hash, target ID, tested commit, environment, commands, outcomes and private evidence location in PROGRESS. Never log personal data or secrets. A real Staging-D1 exercise remains NOT_RUN until separately authorized/executed.

## References

- [Cloudflare Cron Triggers (UTC)](https://developers.cloudflare.com/workers/configuration/cron-triggers/)
- [Scheduled handler](https://developers.cloudflare.com/workers/runtime-apis/handlers/scheduled/)
- [R2 Workers API: conditional operations and pagination](https://developers.cloudflare.com/r2/api/workers/workers-api-reference/)
