# 🌌 AURELIA OPS: ENTERPRISE OPERATIONS CENTER
> **High-Scale, Multi-Tenant, RBAC-Secured, Audit-Complete Helpdesk Automation & Compliance Core.**

---

## 🧭 Project Vision & High-Level Scope
`AURELIA OPS` is a next-generation customer support service platform designed to fulfill enterprise-scale workflows. Engineered under rigorous security principles and built on a full-stack React-Vite front-end backed by an Express module ecosystem, it features fully isolated workspace tenancies, real-time ticket auto-triage (leveraging the Gemini API and robust local fallback heuristics), dynamic telemetry tracking, and compliant regulatory structures.

---

## 🏗️ Technical Architecture & Core Modules
The platform is designed around five decoupled technical core modules to guarantee service isolation and horizontal scalability:

```
                  +----------------------------------------------+
                  |            INBOUND CLOUD INGRESS             |
                  |     (CORS Whitelisting, Static Security)     |
                  +----------------------+-----------------------+
                                         |
                                         v
                  +----------------------+-----------------------+
                  |         EXPRESS API SECURITY EDGE            |
                  | (Brute-force Limiter, Rate Guard, CSRF check)|
                  +----------------------+-----------------------+
                                         |
                                         v
                  +----------------------+-----------------------+
                  |            CENTRAL APIS & SERVICES           |
                  |     - Auth Control     - Workspace Control   |
                  |     - AI Triage        - Billing Engine      |
                  |     - Realtime Gateway - S3 Attachments      |
                  +-------+--------------------+------------+----+
                          |                    |            |
                          v                    v            v
           +--------------+--+       +---------+-------+   ++----------------+
           | DRIZZLE ORM POOL|       | BULLMQ & REDIS  |   | GEMINI LIGHT AI |
           | (PostgreSQL DB) |       | (Async Workers) |   | (Triage Engine) |
           +-----------------+       +-----------------+   +-----------------+
```

### 1. Multi-Tenant Bounds (Workspace Isolation)
*   Every data point is strictly classified under a secure UUID workspace pointer.
*   Security guards guarantee database-level row query filters, preventing cross-tenant leakage.
*   **Role-Based Access Control (RBAC):** Permissions are strictly evaluated across roles (`owner`, `admin`, `agent`, `viewer`, `member`) using a custom ACL matrix.

### 2. Intelligent AI-Triage & Recovery Heuristics
*   **Primary Engine:** Automatic category classification, sentiment tagging, sentiment-escalation rules, and system routing using the `@google/genai` TypeScript SDK.
*   **Heuristic Gateway Fallback:** An inline resilient safety mechanism that intercepts upstream gateway high-load codes (`503 UNAVAILABLE`, `429 Too Many Requests`, and timeout events) to transparently construct deterministic metadata analysis. It guarantees operational queue continuity under any cloud climate.

### 3. Asynchronous Task Architecture
*   Leverages `BullMQ` combined with high-performance `ioredis` instances to schedule, verify, and deliver transactional outbound email alerts without blocking core thread routines.

### 4. Dynamic Live Sync Gateway
*   Utilizes a distributed `Socket.io` cluster to sync incident metric updates, customer dialogue message sequences, and SLA timers on running client dashboards inside real-time responsive UI blocks.

---

## 🔒 Security Compliance Documentation

### OWASP Top 10 Protections
1.  **Strict Transport Security & Frame Guards:** Injects restrictive `X-Frame-Options: DENY` guidelines to block clickjacking, MIME sniffing blocks (`X-Content-Type-Options`), and robust Content Security Policies (CSP).
2.  **Authentication Rate Limiter:** Protects endpoint resources from brute-force automated dictionary testing via restricted login ratelimits (capped strictly at **5 requests per 15-minute window**).
3.  **Tenant CORS Dynamic Whitelist:** Evaluates and filters CORS preflights to ensure client requests originate from registered enterprise subdomains or local debugging ports.

### GDPR Portability & Retention Guidelines (GDPR v2)
*   **Portability Compliance:** Satisfies GDPR Article 20 by providing users with a download module to generate and export a structured, secure, machine-readable JSON archive containing their personal metadata parameters, active session hashes, and data retention guidelines.
*   **Data Purge Control:** Integrates a personal right-to-be-forgotten button that purges active user data, active cookies, and cleans historical log footprints.

---

## 📊 Inbound API Routes Reference

All services are mounted under the `/api` prefix:

### 1. Authentication Services (`/api/auth`)
*   `POST /api/auth/register` - Instantiate a new account. Sends verification tokens.
*   `POST /api/auth/login` - Authenticates user. Emits secure HttpOnly cookie tokens. Capped at 5 maximum trials.
*   `POST /api/auth/logout` - Terminates the active session token JTI, updating the database logs.
*   `GET /api/auth/sessions` - Returns user active session devices log and secure active locations.

### 2. Workspace Management (`/api/workspaces`)
*   `GET /api/workspaces` - Retrieve workspaces mapped to your member account.
*   `POST /api/workspaces` - Initialize a new tenant. Sets up membership schemas.

### 3. Ticket Dispatch & Triage System (`/api/workspaces/:workspaceId/tickets`)
*   `POST /` - Dispatches an incident. Enforces automatic AI/heuristic schema tagging.
*   `GET /` - Retrieve the workspace helpdesk queue with customizable sorting, SLA filters, and categories.
*   `GET /:ticketId` - Retrieve detailed record and dialogue messages.

### 4. Real-time Message Flows (`/api/workspaces/:workspaceId/tickets/:ticketId/messages`)
*   `POST /` - Submit internal thread diagnostic logs or public messages. Broadcasts via Socket.io.

---

## 🐳 Onboarding & Deployment Playbooks

### Running Locally (Minimum Requirements)
1.  **Clone the Repository** and check the variables list:
    ```bash
    cp .env.example .env
    ```
2.  **Install dependencies** using standard package setups:
    ```bash
    npm install
    ```
3.  **Run migrations** and bootstrap the database:
    ```bash
    npm run db:push
    npm run db:seed
    ```
4.  **Launch Dev Server** on port 3000:
    ```bash
    npm run dev
    ```

### Docker Compose Quick<ctrl94>
Deploy a local, production-mirrored full-stack cluster including Node, PostgreSQL database pools, and Redis:
```bash
docker-compose up --build
```

---

## 🩺 DevOps, SRE & Continuity Guidelines

### Continuous Deployment Pipelines
*   **Build Engine:** Vite compiles React static assets under `/dist` while CJS server modules compile cleanly.
*   **Production Launch:** Standalone command triggers compiled output:
    ```bash
    npm run start
    ```

### DevOps Realtime Health Checks
Aurelia Ops implements high-granularity monitoring checkers:
1.  **Liveness (/health):** Returns `200 Healthy` when the Node event loops remain active and free of blockages.
2.  **Readiness (/ready):** Performs queries (`SELECT 1`) to the DB and checks local cache interfaces to confirm full data-layer viability.

---

## 📝 SRE Operational Playbooks & Incident Response

### Playbook-01: Incident High-Latency Recovery
*   **Symptom:** AI category prediction speeds degrade, causing latency peaks during ticket creation.
*   **Mitigation Actions:**
    1.  The gateway automatically redirects flows to **Heuristic Gateway Fallback**.
    2.  Query active load ratios on the upstream API.
    3.  Clear memory buffers inside the cache system if requests queue excessively.

### Playbook-02: DB Connection Exhaustion Event
*   **Symptom:** Sentry logs alert connection exceptions and database liveness checkers `/ready` return `503 Service Unavailable`.
*   **Mitigation Actions:**
    1.  Drizzle connection pools utilize backoff logic (retrying 5 times, exponential delay).
    2.  Check for orphaned PG processes on the database provider (e.g., Supabase console).

---

## 🧪 Quality Assurance & Test Strategy

We maintain a fully test-covered architecture with immediate Vitest unit validation, full route integration tests, and robust Playwright browser test suites.

### 1. Run Vitest Unit & Integration Suites
Executes the comprehensive math, SLA, security rate limit, token validation, and real database verification E2E test file:
```bash
npm run test
```

### 2. Launching Real Playwright Browser Tests (Browser E2E)
Aurelia Ops ships with authentic Playwright browser automation tests that open real chrome engines, fill credentials, submit requests, and inspect DB records:
1.  **Install Playwright browser binaries:**
    ```bash
    npx playwright install
    ```
2.  **Execute browser E2E test scripts:**
    ```bash
    npx playwright test
    ```
3.  **View test interactive GUI dashboard:**
    ```bash
    npx playwright show-report
    ```

---

## 👥 Contributor Workflows

We follow strict developer standards:
1.  Create isolated feature branches (`feature/your-module`).
2.  Run the linters to verify zero warning levels:
    ```bash
    npm run lint
    ```
3.  Ensure all Vitest test suites compile green:
    ```bash
    npm run test
    ```
4.  Open clean Pull Requests targeting main integration environments.

---
*Developed & Managed for Maximum Security Compliance under ISO-27001, OWASP Top 10, and GDPR Regulations.*
