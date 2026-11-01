# SmartFleet - Test Plan

## 1. Project Information
- Project: SmartFleet Vehicle Usage Web Application
- Baseline Version: v3.8.5
- Target Version: v4.2.0
- Repository: kritsuwan1/smart-fleet
- Test Environment: Isolated Staging
- Production Testing: Read-only checks unless explicitly approved

## 2. Testing Principles
1. Inspect the current source code before writing tests.
2. Reuse existing test frameworks and conventions.
3. Never run destructive tests against Production.
4. Use synthetic or anonymized test data.
5. Verify both success and failure scenarios.
6. Do not mark tests passed without execution evidence.
7. Record failed tests and unresolved issues.
8. Preserve all existing vehicle records.
9. Require approval before Production deployment.

## 3. Test Levels
- Unit Tests: Validation and calculation logic
- Integration Tests: API and database interactions
- End-to-End Tests: Complete user workflows
- Security Tests: Authentication and authorization
- Regression Tests: Existing functionality
- Restore Tests: Database backup and recovery
- UAT: User acceptance testing

## 4. Baseline Regression Tests - v3.8.5

### TC-001: User Login
Steps:
1. Open login page.
2. Enter valid credentials.
3. Submit login form.
Expected: Authorized user can access permitted pages.

### TC-002: Invalid Login
Steps:
1. Enter invalid credentials.
2. Submit login form.
Expected: Login is rejected without exposing sensitive information.

### TC-003: Vehicle Trip Recording
Steps:
1. Select vehicle.
2. Enter required trip information.
3. Submit the record.
Expected: Exactly one valid trip record is saved.

### TC-004: Odometer Validation
Steps:
1. Enter invalid odometer values.
2. Attempt to submit.
Expected: Invalid values are rejected without data corruption.

### TC-005: Trip Save Confirmation
Steps:
1. Save a valid trip.
2. Inspect confirmation screen.
Expected: Vehicle plate, saved time, odometer and detail navigation are correct.

### TC-006: Existing Data Integrity
Steps:
1. Record baseline counts and checksums.
2. Execute tests on isolated staging data.
3. Compare preserved historical records.
Expected: Existing historical records remain unchanged.

## 5. Security and Backup - v3.8.6

### TC-101: Scheduled Backup
Expected: Backup executes at the configured schedule.

### TC-102: Backup Retention
Expected: Retention follows the approved policy.

### TC-103: Backup Integrity
Expected: Backup artifact is complete and readable.

### TC-104: Database Restore
Expected: Backup restores successfully to an isolated test database.

### TC-105: Unauthorized Backup Access
Expected: Non-Admin users cannot access backup data or operations.

### TC-106: Backup Failure Handling
Expected: Failed backups are logged and notification is triggered.

### TC-107: Maintenance Verification
Expected: Existing maintenance reminders behave according to verified requirements.

### TC-108: Secret Protection
Expected: No credentials or private secrets are exposed in logs, code or backup downloads.

## 6. Mobile UX/UI - v3.9.0

### TC-201: Responsive Layout
Expected: No unintended horizontal overflow at 360px, 390px, 768px and desktop widths.

### TC-202: Mobile Trip Entry
Expected: User can complete the full trip workflow on a mobile device.

### TC-203: QR Code Entry
Expected: QR code opens the correct vehicle workflow.

### TC-204: Duplicate Submission
Expected: Repeated taps do not create duplicate records.

### TC-205: Save Confirmation
Expected: Correct saved values are displayed after submission.

### TC-206: Cross-Browser Compatibility
Expected: Critical workflows function in supported Chrome, Edge and mobile Safari browsers.

## 7. Dashboard and Reports - v4.0.0

### TC-301: Dashboard Summary
Expected: Total trips and distance match the underlying records.

### TC-302: Date Filtering
Expected: Filters return records within the selected date range.

### TC-303: Driver and Vehicle Filtering
Expected: Results match the selected driver and vehicle.

### TC-304: PDF Export
Expected: PDF opens correctly and includes accurate report data.

### TC-305: Excel Export
Expected: Excel opens correctly and contains accurate records.

### TC-306: Empty Data
Expected: Dashboard and reports handle empty results without errors.

## 8. User and Permission Management - v4.1.0

### TC-401: Admin Access
Expected: Admin can access authorized administration features.

### TC-402: Staff Access
Expected: Staff can access only permitted functionality.

### TC-403: User Access
Expected: User can access only permitted personal records.

### TC-404: Pending Approval
Expected: Unapproved accounts cannot access restricted pages or APIs.

### TC-405: Unauthorized API Access
Expected: Requests without required permissions are rejected.

### TC-406: Account Deactivation
Expected: Deactivated accounts cannot continue accessing protected resources.

### TC-407: Audit Logging
Expected: Important administrative changes are logged with appropriate metadata.

## 9. Multi-Vehicle Management - v4.2.0

### TC-501: Vehicle Creation
Expected: Authorized Admin can create a valid vehicle record.

### TC-502: Vehicle Data Isolation
Expected: Trips and odometer histories remain associated with the correct vehicle.

### TC-503: Vehicle QR Code
Expected: Each QR code identifies the intended vehicle.

### TC-504: Conflicting Trips
Expected: Conflicting active trips are rejected according to approved business rules.

### TC-505: Historical Migration
Expected: Existing vehicle 8กน3362 Bangkok records are preserved.

### TC-506: Multi-Vehicle Reports
Expected: Individual and combined reports calculate correctly.

## 10. Required Test Evidence
For each test run, record:
- Test ID
- Version and commit hash
- Environment
- Execution date
- Test result: PASS, FAIL, BLOCKED or NOT_RUN
- Relevant command or test method
- Error summary when applicable
- Evidence location

## 11. Release Acceptance Criteria
A release may be proposed only when:
1. Build succeeds.
2. Required automated tests pass.
3. No unresolved Critical or High security issues remain.
4. Critical business workflows pass UAT.
5. Existing historical records remain intact.
6. Backup and recovery requirements are verified where applicable.
7. Database migrations are tested on staging.
8. Rollback procedures are documented.
9. Production deployment receives explicit approval.

## 12. Deployment Safety
- Never automatically deploy Production during development.
- Never execute destructive migrations against Production.
- Never use Production credentials in staging.
- Never copy personal data into public test artifacts.
- Stop and request approval when a required operation could affect Production.

## 13. Test Reporting Template

Version:
Commit:
Environment:
Execution Date:
Tests Passed:
Tests Failed:
Tests Blocked:
Tests Not Run:
Known Issues:
Migration Required:
Rollback Plan:
Production Deployment Approved: NO

## 14. Current Test Status
Baseline verification: NOT_RUN
Batch 1 tests: NOT_RUN
Batch 2 tests: NOT_RUN
Batch 3 tests: NOT_RUN
Production deployment: NOT AUTHORIZED

## 15. Next Action
1. Inspect the actual source code and test infrastructure.
2. Map test cases to existing modules.
3. Identify missing automated tests.
4. Update ARCHITECTURE.md and PROGRESS.md.
5. Begin development on an isolated branch.

## 16. Task 2A - Automatic Backup development verification

The earlier NOT_RUN statuses describe the original planning snapshot. Current execution results are recorded in PROGRESS.md; mock/offline results do not imply a real R2/D1 or scheduled deployment was tested.

New suite: tests/automatic-backup.test.mjs, appended to npm test (13 suite files total). Uses synthetic state, in-memory SQLite, an R2 mock, mocked notifications and both built Worker variants.

| Case | Automated coverage |
| --- | --- |
| AB-001 / TC-101 | UTC cron constant and Bangkok date boundary; default-off handler; separate build/binding/environment markers |
| AB-002 / TC-103 | Full state and unknown legacy fields preserved, source version/counts/bytes metadata, SHA-256 of state and envelope, corrupt metadata/body/reference rejection |
| AB-003 | Immutable daily object, duplicate invocation, concurrent jobs, active/expired/stolen token leases, ambiguous successful put acknowledgement |
| AB-004 / TC-102 | Paginated retention, today plus six previous dates, exact boundary, environment/unrelated-key isolation, sole last-valid-copy preservation when new upload fails |
| AB-005 / TC-106 | Transient and persistent R2 failures, bounded retry count, read-back missing/corrupt, list/delete failures, D1 status failure fallback, retry from an existing valid artifact |
| AB-006 / TC-105/108 | Admin 200/employee 403/anonymous 401 status access, no authentication fields in status, raw failures/secrets excluded from logs and notification payloads, notification failure/unconfigured outcomes |
| AB-007 / TC-104 | Actual SQLite restoration into empty Demo-marked target, full normalized state equality/session rotation, production/occupied/corrupt targets rejected before writes, production-source-to-staging restore |
| AB-008 / TC-006 | Source main payload AND version unchanged after backup success/failure; missing main is never initialized |
| AB-009 | Offline CLI rehearsal uses a local temporary private fixture and in-memory DB; output excludes state/session/account secrets |

Before Staging activation (NOT_RUN in Task 2A):

1. Verify actual R2 bucket privacy, IAM/bindings/environment separation and absence of unsafe object lifecycle rules.
2. Run approved Staging cron and verify the actual 02:00 Asia/Bangkok timestamp; test provider retries, storage latency/timeouts and a process killed before status completion.
3. Inject Staging R2/D1/webhook failures, verify redacted provider logs, last-success-age monitoring and failure delivery.
4. Execute the documented empty-Staging-D1 recovery drill and compare historical trip/odometer/account integrity.
5. Review BackupPanel in a browser including disabled, never, running, success, failed and unavailable states.

No Production trigger/resource/configuration change, deployment, merge, migration or real restore is authorized by these tests.
