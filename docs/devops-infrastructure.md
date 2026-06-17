# Aurelia Ops Enterprise DevOps, Infrastructure & Database Administration Specification

This document defines the official engineering specification for the **Aurelia Ops DevOps Pipeline, Containerization, Infrastructure, Security, and Database Administration**. It forms the core operational guidelines for deployment topologies, cluster orchestration, automation, secrets custody, and continuous integration/continuous delivery patterns.

---

## 1. Multi-Stage Containerization Strategy (9.1)

Aurelia Ops utilizes native **Docker** containers structured via highly optimized, multi-stage compilation builds. This pattern segregates compilation dependencies, minimizing the final production image footprint and eliminating standard attack surface vectors (such as vulnerable compiler tools).

### 1.1 Optimized Multi-Stage Dockerfile Layout
```dockerfile
# Stage 1: Build & Compilations Node
FROM node:20-alpine AS build-env
WORKDIR /app

# Install apk packages for native packages compilation
RUN apk add --no-cache python3 make g++ Git

# Copy package-lock files and install dependencies
COPY package*.json ./
RUN npm ci

# Copy source trees and compile standard production files
COPY . .
RUN npm run build

# Stage 2: Production Execution Runtime
FROM node:20-alpine AS runtime-env
WORKDIR /app
ENV NODE_ENV=production

# Install light-weight system packages and utilities
RUN apk add --no-cache curl openssl

# Direct container resource allocations
LABEL org.opencontainers.image.authors="operations@aurelia.io"
LABEL org.opencontainers.image.title="aurelia-ops-fullstack"

# Copy minimal compilation artifacts from Stage 1
COPY --from=build-env /app/package*.json ./
COPY --from=build-env /app/dist ./dist
COPY --from=build-env /app/node_modules ./node_modules
COPY --from=build-env /app/uploads ./uploads

# Configure container execution limits and security context
USER node
EXPOSE 3000

# Automated runtime health checks
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD curl -f http://localhost:3000/api/health || exit 1

ENTRYPOINT ["node", "dist/server.cjs"]
```

### 1.2 Kubernetes Operational Manifest File
To support automated elasticity, we deploy service pods controlled via Kubernetes workload templates:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: aurelia-ops-deployment
  namespace: production
  labels:
    app: aurelia-ops
spec:
  replicas: 3
  selector:
    matchLabels:
      app: aurelia-ops
  template:
    metadata:
      labels:
        app: aurelia-ops
    spec:
      containers:
      - name: aurelia-web-api
        image: gcr.io/aurelia-production/ops-service:5.0.0
        ports:
        - containerPort: 3000
        resources:
          requests:
            cpu: "200m"
            memory: "512Mi"
          limits:
            cpu: "1000m"
            memory: "1024Mi"
        livenessProbe:
          httpGet:
            path: /api/health
            port: 3000
          initialDelaySeconds: 15
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /api/health
            port: 3000
          initialDelaySeconds: 10
          periodSeconds: 5
```

---

## 2. CI/CD Operations Pipeline Manual (9.2)

Our development workflow implements high-discipline automation gates through GitHub Actions, ensuring that no bad code blocks reach master execution pathways.

### 2.1 Commit and Pull Request Gates
The compilation workflow executes on every pull request targeting `main` or `production`:

```
 [Branch Feature Code Changes]
             |
             |-----> Trigger Git Pull Request Gate
                          |
                          v
             [Static Code Scan & Linters]
                          |
                          +---> ESLint & Stylelint check
                          +---> Audit dependency vulnerabilities
                          |
             [Comprehensive Vitest Suites]
                          |
                          +---> Executing Unit Tests (48 tests)
                          +---> executing Integration Suites (5 tests)
                          +---> Performing E2E DB validations (1 test)
                          |
             [Visual Browser checks] (Playwright browser headless run)
                          |
                          v
         [Build Docker Image Construction Check] (Dry run build)
                          |
                          v
             [Pass PR Checks & Apply Admin Review Marks]
```

### 2.2 Blue-Green & Canary Progressive Rollouts
Deployments use Blue-Green mechanics routed via edge proxies (e.g. Nginx, Cloudflare Tunnel):
1. **Blue Node**: Represents the current running version processing client transactions.
2. **Green Node**: The target release deployment.
3. **Execution Routing**: Incoming traffic gradually switches from Blue to Green. In the event of latency regressions or error spikes exceeding a `1.5%` threshold, the traffic controller is immediately reverted to the blue cluster (rollback automation).

---

## 3. Operations Monitoring, Observability, and Alerting (9.3)

Operational variables feed automatically to our monitoring dashboards. We define automated response runbooks for common incident triggers.

### 3.1 Alerts Taxonomy and Escalation Matrix
- **Alert Trigger: Database connection limits > 80%**
  - *Severity*: Warning
  - *Mitigation Plan*: Recycle stale active sessions blocks via connection pool cleaning.
- **Alert Trigger: Host CPU limits > 85% for 3+ minutes**
  - *Severity*: Critical
  - *Mitigation Plan*: Dynamic K8s horizontal scaling triggers the instantiation and routing of additional client pods.
- **Alert Trigger: SLA Breach Warning Spike > 5 within 10 minutes**
  - *Severity*: Prioritized
  - *Mitigation Plan*: Automatically dispatches high-priority Slack notifications and tickets on-call on PagerDuty.

### 3.2 Automated Runbook Automation Action Example
If host memory allocation drops below a safe baseline, the container engine triggers an internal garbage collection sweep before initiating restart actions.

---

## 4. Multi-Layer Security Operations Architecture (9.4)

Aurelia Ops implements a rigorous zero-trust security strategy to protect customer information and database clusters.

### 4.1 Secrets and Environment Variable Custody
- **No Direct Custody**: Secrets (e.g. `JWT_SECRET`, `GEMINI_API_KEY`, `DATABASE_URL`) are never committed to repositories or written in plain-text configuration files.
- **Dynamic Ingestion**: Secrets are provisioned dynamically at build or runtime through secure orchestrator injection (e.g., Google Secret Manager, HashiCorp Vault, AWS Secrets Manager) and bind exclusively as container system environment variables.

### 4.2 Network Isolation & Virtual Private Cloud (VPC)
- **Edge Shielding**: All incoming public traffic is strictly filtered by global firewalls enforcing DDoS mitigation.
- **Isolated Layers**: Database instances are locked deep inside isolated private subnet structures without public IP routes. Only the Express backend nodes operating on port `3000` with explicit subnet routing rights can execute queries.
- **Transport Security**: Direct endpoint communications and client APIs systematically enforce HTTPS/TLSv1.3 standards.

---

## 5. Enterprise Database Administration & Disaster Recovery (9.5)

To guarantee high availability and data durability, Aurelia Ops PostgreSQL structures follow strict recovery, verification, and performance disciplines.

### 5.1 Automated Multi-Region Backups Schedule
- **Automated Snapshots**: Database system generates automated backups:
  - Hourly transactional WAL (Write-Ahead Logging) archives sent to warm replication storage buckets.
  - Daily full historical physical dump backups with strict `30-day` retention cycles.
- **Validation Workflows**: Injected task workers automatically mount the latest daily snapshots in an isolated sandbox database, executing validation checks (e.g., querying schema tables, confirming user list records exist) to guarantee backup integrity and verify disaster recovery drills.

### 5.2 Connection Pool Tuning & Optimizations
We enforce connection threshold optimizations inside `/src/server/shared/db.ts` to coordinate resource scaling:
- **`max` Connections Limit**: Adjusted to `50` per instances node under intensive helpdesk workloads.
- **`idleTimeoutMillis`**: Set to `30000` ms. Releases unused client connections to target PostgreSQL processes.
- **`connectionTimeoutMillis`**: Caps initial socket handshakes at `2000` ms, preventing route blockage under heavy traffic.
