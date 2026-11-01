# Maintenance Reminder — Task 3A (Development only)

The user approved the additive Fleet State design before implementation. No SQL schema, database, production configuration, resource or R2 change is required. This feature is an in-app Dashboard reminder; it sends no external notifications and registers no cron.

## Data and compatibility

Fleet gains optional maintenancePlans and maintenanceHistory arrays. Missing fields mean no plans/history and are not eagerly written during reads. Existing cars, trips, people, projects, accounts, unknown legacy fields and session material remain intact. Plans reference cars by carId; history references planId and the same carId. The main JSON still uses the existing optimistic version check and 1,500,000-byte application limit; maintenance/history/audit growth consumes this allowance.

Plan fields: id, carId, type (oil/inspection/insurance/tax/other), name, active, optional dueOdo/dueDate, optional intervalKm/intervalDays, warnKm and warnDays. Dates are ISO YYYY-MM-DD calendar dates. At least one due criterion is required. A recurrence interval must be a positive integer and have a corresponding due criterion. Warning windows are nonnegative integers. Custom work uses type other and its own name.

History fields: id, planId, carId, date, odometer, details and costSatang (nonnegative safe integer; UI displays baht). History is append-only in this version. A completion cannot be future-dated, predate the same plan's most recent service or regress its service odometer; it cannot be below the car's initial odometer. Service mileage does not change the car/trip odometer. An administrator may enter a service odometer above the latest recorded trip if the vehicle moved outside a recorded trip; no trip is created automatically.

No destructive migration or maintenance deletion action exists. Plans may be disabled/re-enabled and renamed; carId cannot change for an existing plan. Editing a plan preserves its history, though the current plan name is displayed for past history. Audit before/after snapshots retain the names/configuration at each action. Do not roll back to unreviewed code that could rebuild or discard unknown fields; retain a private full-state backup and test any rollback in isolated SQLite first.

## Reminder rules

- Uses the existing latestOdo function (employee views receive a server-derived current odometer); no change to trip validation or mileage calculations.
- Overdue: current odometer is at/above dueOdo OR Bangkok calendar date is after dueDate.
- Near: not overdue and either remaining km <= warnKm or remaining calendar days <= warnDays. A job due today is near, not date-overdue.
- Normal: neither condition applies. When both criteria exist, the more urgent condition wins. Disabled plans do not appear in employee reminders.
- The displayed Bangkok date refreshes every minute while the Dashboard panel is mounted. Trip/odometer changes arrive through the existing data refresh/save paths; this is not a push or background monitoring service.
- Recording service advances recurring km from actual service odometer and recurring days from actual service date (fixed days, not calendar months). A completed non-recurring dimension is removed when the other dimension recurs. Plans with no recurrence are disabled after completion, preserving their due values/history. Changing a plan can configure the next cycle explicitly.

## Access and operation

Dashboard shows the panel for both roles. Admin can add/edit/disable plans and record service with date, odometer, details and baht amount; history is visible to Admin. Employee sees active plans/statuses only, without history/costs/details. Server authorization rechecks the current user through the existing fleet API; UI hiding is not the access control. Writes use action maintenance, operation plan or complete, and the existing version number. Stale version returns 409 without writing; employee writes return 403. Existing same-origin/session rules continue to apply. UI has a request lock, busy controls, validation/error messages and a refresh on conflict.

Layout uses wrapping cards, labelled inputs, 44px buttons and a single-column form below 600px. React escapes names/details. Automated rendering checks cover role-specific markup and escaping; real mobile-device/browser interaction and Staging UAT are NOT_RUN and remain required before release.

## Backup and verification

Manual SQL/JSON and automatic artifacts retain the complete state including both optional arrays. JSON inspection validates maintenance references, duplicate IDs, dates and numeric limits when fields are present; legacy backups without them remain valid. Automatic recovery still requires an empty demo-marked isolated target and rotates sessionKey. No backup format/schema-version change is introduced; the fields are additive. A legacy backup cannot contain maintenance created after it was taken, so choosing an older snapshot is a data-recovery decision, not an automatic migration path.

tests/maintenance.test.mjs uses synthetic data, SQLite :memory:, built Worker authentication and React static rendering. It covers legacy reads without migration, km/date/either rules and Bangkok boundary, all categories, numeric/date validation, recurrence/one-off plans, role redaction/write denial, stale-write atomicity, audit, unrelated cars/trips/import preservation, JSON validation, SQL export/recovery and automatic isolated recovery equality excluding sessionKey. npm test now runs 14 suites. No real Cloudflare credentials or data are required. Current execution evidence is in PROGRESS.md.

R2 integration remains deferred/NOT_RUN. Dependency findings from Task 2B.1 remain open; this feature neither upgrades packages nor approves production release.
