# Aurelia Ops Enterprise Developer Guide

Welcome to the **Aurelia Ops Developer Guide**. This manual details local configuration instructions, codebase conventions, migration workflows, testing guidelines, and troubleshooting procedures to ensure a highly disciplined engineering and contribution cycle.

---

## 1. Quick Start / Local Environment Setup

### 1.1 Prerequisites
Our development workspace requires the following services on your host machine:
- **Node.js**: `v20.x` or higher (Long-Term Support version recommended)
- **NPM Package Manager**: `v10.x` or higher
- **PostgreSQL**: `v16` or higher (if running database locally outside Docker)

### 1.2 Installation Instructions
1. Install initial dependencies:
   ```bash
   npm install
   ```
2. Copy sample configurations to define local variables:
   ```bash
   cp .env.example .env
   ```
3. Populate `.env` with localized keys (such as `DATABASE_URL` and `JWT_SECRET`).
4. Generate database schema tables and launch development containers:
   ```bash
   npm run db:generate
   npm run db:migrate
   npm run dev
   ```
   The local application will compile and launch on `http://localhost:3000`.

---

## 2. Tools Ecosystem

Aurelia Ops enforces clean, readable code styles across all modules using these automated linters and testers:

- **ESLint**: Lints server and client TypeScript logic against strict structural rules.
  ```bash
  npm run lint
  ```
- **Prettier**: Resolves automatic style layouts, parentheses, and brace wrapping.
  ```bash
  npm run format
  ```
- **Stylelint**: Ensures Tailwind configuration structures and global index styles remain healthy.
  ```bash
  npm run stylelint
  ```
- **Vitest**: Runs fast, in-memory unit tests with active mock environments.
  ```bash
  npm run test:unit
  ```
- **Playwright**: Validates visual user interfaces, button actions, and e2e dashboards.
  ```bash
  npx playwright test
  ```

---

## 3. Advanced Debugging Techniques

### 3.1 VS Code Launch Configuration (launch.json)
Place the following `.vscode/launch.json` inside your local workspace directory to debug local Express routing controllers:

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "type": "node",
      "request": "launch",
      "name": "Debug Aurelia Backend API",
      "runtimeExecutable": "npx",
      "runtimeArgs": ["tsx", "server.ts"],
      "env": {
        "NODE_ENV": "development",
        "PORT": "3000"
      },
      "sourceMaps": true,
      "console": "integratedTerminal"
    }
  ]
}
```

### 3.2 Live Logging and Request Tracing
- **X-Request-Id Correlation**: Each request through the Express API router is tagged with a unique `RequestId` (available as an `X-Request-Id` header). Make sure to pass this correlation ID along when printing logs so database and API warnings are matching:
  ```typescript
  console.log(`[${req.requestId}] Attempting multi-factor verify lookup for address: ${email}`);
  ```

---

## 4. Software Feature Development Checklist

Developers must satisfy the following checklist before merging any feature branch to the core branch:

- [ ] **Type Integrity**: No generic `any` overrides or cast-bypasses. Every interface matches localized domain validations.
- [ ] **Separated Schemas**: Validation rules added must leverage split schemas inside `/src/server/shared/validators/` instead of bloat within route controllers.
- [ ] **Repository Isolation**: Direct SQL queries inside Express routes are forbidden. Database interactions reside exclusively in appropriate `/repository` wrappers.
- [ ] **Test Coverage**: All unit validations maintain coverage targets and build successfully via `vitest`.
- [ ] **No Mock Infrastructure**: New models hook directly into real repository files and schema structures.

---

## 5. Code Review Process and Guidelines

All code contributions must go through our formal review pipeline:
1. **Branch Naming Conventions**: Use domain indicators like `feature/` or `bugfix/` (e.g. `feature/sla-strategy-tier`).
2. **Review Criteria**:
   - Verify that database operations have single-flight query counts to prevent $N+1$ query issues.
   - Guard user inputs with strict parsing logic to prevent SQL Injection (SQLi) and Cross-Site Scripting (XSS).
   - Check password variables for raw leaks; assure secret variables bypass log prints.
3. Review `/docs/code-review-checklist.md` before approving merges to high-priority branches.

---

## 6. Performance Optimization Playbook

To preserve snappy responsiveness across all platforms, comply with the following paradigms:

- **Database Queries Indexing**: Frequently accessed search keys (such as `workspace_id`, `status`, `customer_id`) must have active indices in Drizzle schema definitions.
- **Lazy Load Client Views**: Ensure React route components utilize lazy rendering bounds:
  ```typescript
  const AuditDashboard = React.lazy(() => import("./features/audit/AuditDashboard"));
  ```
- **Optimized Asset Pipeline**: Rely on Vite's split chunking patterns to keep output file buffers smaller than `500KB`.

---

## 7. Database Migration Playbook

### 7.1 Generating New Schema Migrations
Aurelia Ops uses **Drizzle Kit** to track database schemas. If you modify `/src/server/shared/schema.ts`:
1. Execute the schema analyzer to generate structural SQL changes:
   ```bash
   npx drizzle-kit generate
   ```
2. Inspect the generated schema updates inside `/drizzle/` folders to verify safety.

### 7.2 Executing Migrations in Production Environments
During container deployment, migrations must execute before starting web nodes. The build server runs:
```bash
npx drizzle-kit migrate
```
If table columns require safe defaults or destructive conversions, write custom migration overrides and verify they can execute incrementally.

---

## 8. Deployment and Rollback Procedures

### 8.1 Production Deployment Pipeline
Our release engine runs builds as follows:
1. **Docker Container Construction**: The `Dockerfile` compiles assets using a multi-stage process, dropping development tool packages before production outputs.
2. **Service Verification**: Check API health status:
   ```bash
   curl -f http://api.aurelia.io/api/health
   ```

### 8.2 Safe Rollback Directives
If a live deployment displays high failure counts (e.g., error rates > 2%):
1. **Immediate Ingress Redirect**: Roll Nginx routes back to the previous stable blue node.
2. **Database Schema Fallback**: Drizzle-kit does not perform automatic downgrades. If schemas need to revert, apply manual backup restore routines or write an explicit inverse migration script.

---

## 9. Emergency Procedures (The Panic Manual)

### 9.1 Revoking Active Sessions Admin Command
If user credentials leak, revoke authorization streams from the workspace console or execute a system database command:
```sql
UPDATE sessions SET is_revoked = true WHERE user_id = 'usr-compromised-uuid';
```

### 9.2 Direct Admin Reset Flow
If an admin can't log in due to mail delivery issues, reset MFA settings securely via CLI:
```bash
npm run cli:reset-mfa -- --email=admin@aurelia.io
```
This tool clears the associated `mfa_enabled`, `mfa_secret`, and `mfa_backup_codes` values out of database systems.

---

## 10. Technology Decision Matrix

Before introducing brand new npm packages, follow this structured criteria:

```
        +----------------------------------------+
        | Need to add a new logic component?      |
        +----------------------------------------+
                            |
           [Can it be done in native TS?]
            /                          \
          YES                           NO
          /                               \
[Write native logic]         [Analyze library security]
                                          |
                              [Is package size <50KB?]
                                /                  \
                              YES                   NO
                              /                       \
                      [Approve package]       [Seek architectural review]
```
- No unsanctioned modules or styling frameworks (strictly Tailwind, standard Express router, Drizzle ORM).
