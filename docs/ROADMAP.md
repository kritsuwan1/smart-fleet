# SmartFleet Development Roadmap

## Project Information
- Project: SmartFleet Vehicle Usage Web Application
- Baseline: v3.8.5
- Target: v4.2.0
- Development strategy: Batch Development
- Production policy: No deployment without explicit approval

## Development Principles
1. Preserve all existing vehicle usage data.
2. Reuse existing features and components.
3. Inspect source code before implementing changes.
4. Use separate development branches.
5. Use an isolated staging database for testing.
6. Complete tests before production deployment.
7. Update PROGRESS.md after each development batch.

## Batch 1: Core Stability

### v3.8.6 - Security and Automatic Backup
- Verify existing backup and maintenance implementations.
- Implement scheduled automatic database backups.
- Proposed schedule: Daily at 02:00 Asia/Bangkok.
- Proposed retention: 7 daily backups.
- Add backup status monitoring for Admin.
- Implement failure notifications.
- Verify server-side authorization.
- Test restoration using an isolated staging database.
- Protect sensitive information and credentials.

Acceptance Criteria:
- Scheduled backups execute successfully.
- Backup integrity is verified.
- Staging restoration succeeds.
- Unauthorized users cannot access backups.
- Existing production records remain unchanged.

### v3.9.0 - Mobile UX/UI
- Improve mobile dashboard layout.
- Optimize vehicle check-out and return workflows.
- Support vehicle QR code entry.
- Improve odometer validation.
- Prevent duplicate submissions.
- Display save confirmation with vehicle plate, time and odometer.
- Support responsive layouts from 360px width.

Acceptance Criteria:
- Critical workflows work on mobile.
- No horizontal overflow on supported screens.
- Data validation and submission work correctly.
- Existing desktop functionality remains operational.

## Batch 2: Management

### v4.0.0 - Dashboard and Reports
- Display total trips and distance.
- Show monthly vehicle usage charts.
- Filter by date, driver and vehicle.
- Export PDF and Excel reports.
- Include maintenance information.
- Support summary and detailed reports.

Acceptance Criteria:
- Dashboard values match database records.
- PDF and Excel exports are valid.
- Filters return accurate results.

### v4.1.0 - Users and Permissions
- Support Admin, Staff and User roles.
- Implement Admin approval for new accounts.
- Enforce server-side access control.
- Record important administrative changes.
- Support account deactivation.
- Verify session and authorization security.

Acceptance Criteria:
- Users can only access permitted resources.
- Admin approval works correctly.
- Direct API access cannot bypass permissions.

## Batch 3: Fleet Expansion

### v4.2.0 - Multi-Vehicle Management
- Add and manage multiple vehicles.
- Support vehicle-specific QR codes.
- Maintain independent odometer histories.
- Filter reports by vehicle.
- Prevent conflicting active trips.
- Preserve historical records for vehicle 8กน3362 Bangkok.
- Test database migration before deployment.

Acceptance Criteria:
- Vehicle data remains isolated.
- Historical trip data is preserved.
- Reports work across multiple vehicles.
- Migration is tested and reversible where possible.

## Required Workflow
1. Inspect repository and existing functionality.
2. Review ARCHITECTURE.md and PROGRESS.md.
3. Identify missing features.
4. Implement changes on a development branch.
5. Run build, lint and available tests.
6. Perform staging integration testing.
7. Document results in PROGRESS.md.
8. Prepare release notes and rollback plan.
9. Request approval before production deployment.

## Deployment Rules
- Never modify production data without approval.
- Never deploy automatically as part of a development task.
- Never commit secrets or environment credentials.
- Stop before destructive database operations.
- Require a verified backup and recovery plan before migrations.

## Status
Roadmap: Planned
Implementation: Not verified
Production changes: None authorized
