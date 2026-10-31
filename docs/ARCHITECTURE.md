# SmartFleet - System Architecture

## 1. Project Overview
Project: SmartFleet Vehicle Usage Web Application
Baseline Version: v3.8.5
Repository: kritsuwan1/smart-fleet

Purpose:
- Record company vehicle usage
- Track trips and odometer readings
- Manage vehicle maintenance
- Generate usage reports
- Support secure administration

## 2. Known Repository Structure
- src/ : Application source code
- assets/ : Static assets
- scripts/ : Utility and build scripts
- tests/ : Application tests
- .github/workflows/ : GitHub automation
- package.json : Project dependencies and scripts
- schema.sql : Database schema file
- schema-demo.sql : Demo schema file
- schema-production.sql : Production schema file
- build.mjs : Build script

Note: Directory contents and actual runtime behavior
must be verified against the current source code.

## 3. Technology Stack
Status: Pending source code verification

Codex must inspect:
- package.json
- build.mjs
- src/
- Database connection modules
- GitHub Actions workflows
- Deployment configuration

Do not assume the framework, hosting provider,
database provider, or authentication implementation.

## 4. Core Application Modules
The following are functional areas, not verified modules:
- Authentication and user management
- Vehicle usage and trip records
- Odometer validation
- Dashboard and reporting
- Maintenance management
- Automatic backup
- Multi-vehicle management

For each area, identify:
- Existing implementation
- Relevant source files
- API endpoints
- Database tables
- Dependencies
- Missing functionality

## 5. Database Architecture
Status: Pending verification

Inspect schema.sql, schema-demo.sql,
schema-production.sql and application queries.

Requirements:
- Preserve existing trip records
- Preserve odometer history
- Avoid destructive schema changes
- Test migrations in staging first
- Keep production and staging isolated
- Verify backup and restoration

## 6. Security Architecture
Requirements:
- Enforce authorization on the server
- Support role-based access control
- Protect environment secrets
- Never commit credentials
- Restrict backup access to Admin
- Maintain audit logs for sensitive operations

## 7. Deployment Architecture
Status: Pending verification

Inspect:
- .github/workflows/
- Deployment scripts
- Environment configuration
- Production branch configuration

Rules:
- Develop on isolated branches
- Test before deployment
- Never modify production without approval
- Document rollback procedures

## 8. Development Workflow
1. Read AGENTS.md
2. Read docs/ROADMAP.md
3. Inspect existing architecture
4. Identify affected components
5. Implement the smallest necessary changes
6. Run available automated tests
7. Validate staging behavior
8. Update docs/PROGRESS.md
9. Request approval before deployment

## 9. Architecture Verification Tasks
Codex must document:
- Actual technology stack
- Application entry points
- Source directory structure
- Database tables and relationships
- Authentication flow
- Existing API endpoints
- Deployment workflow
- Backup implementation status
- Maintenance implementation status

## 10. Current Status
Architecture documentation: Draft
Source code verification: Pending
Production modifications: Not authorized
