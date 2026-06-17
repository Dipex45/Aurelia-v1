# Aurelia Ops Enterprise Logging, Monitoring & Observability Guide

This document defines the official technical manual for **Aurelia Ops Observability Frameworks**. It outlines structured JSON logging policies, system performance monitoring, APM rulesets, Profiling guidelines, Sentry error tracking, and V5-specific telemetry checks.

---

## 1. Context-Aware Structured Logging (7.1)

Aurelia Ops implements standardized, high-performance structured logging in JSON format. This format is designed for painless parsing by ingestion agents (e.g. Logstash, FluentBit, Datadog Agent) and immediate searchability across index pools.

### 1.1 JSON Schema Data Contract
Every log entry issued is a flat JSON block adhering to this layout:

```json
{
  "timestamp": "2026-06-17T20:30:15.123Z",
  "level": "ERROR",
  "service": "api-gateway",
  "requestId": "4fa817c0-ee92-41ba-ac12-db07a90f38b1",
  "userId": "usr-45",
  "workspaceId": "ws-23",
  "path": "/api/workspaces/ws-23/tickets",
  "method": "POST",
  "message": "Failed to create ticket: Customer account is inactive",
  "durationMs": 42.15,
  "exception": {
    "name": "ApiError",
    "message": "Customer account inactive",
    "stack": "ApiError: Customer account inactive\n    at TicketService.createTicket (/app/src/server/modules/tickets/tickets.service.ts:45:12)"
  }
}
```

### 1.2 Log Level Severity Strategies
- **DEBUG**: Low-level diagnostics, raw query maps, and intermediate state changes. Disabled by default in production clusters.
- **INFO**: Standard workflow transitions (e.g. `User logged in`, `SLA calculations computed`, `Automation rule matched`).
- **WARN**: Safe recoverable errors or performance anomalies (e.g. `SMTP connection timed out; retrying`, `Database query duration exceeded 200ms`, `Authentication code mismatch`).
- **ERROR**: Action or transaction failures affecting user processes (e.g. `Ticket update failed`, `MFA validation exception`).
- **FATAL**: Unrecoverable runtime crashes causing server shutdown (e.g. `Database migration failure on boot`, `EADDRINUSE port binding conflicts`).

### 1.3 Contextual Request ID Propagation
Through Express request correlation middleware, every incoming HTTP request receives or forwards a unique `X-Request-Id` header:
- The correlation engine binds the `requestId` to async context storage (utilizing Node.js `AsyncLocalStorage`).
- Standard console outputs dynamically merge this token. When looking at downstream task worker logs, engineers can map a background mail issue to the specific user request that triggered it.

### 1.4 Cryptographic Sensitive Data Masking & Log Sampling
- **Sensitive Key Detection**: A serialization engine scans objects before printing to mask secret parameters (e.g., matching keys like `password`, `mfa_secret`, `mfa_backup_codes`, `refresh_token`, `creditCard`). These parameters are systematically replaced with the literal `[REDACTED_SENSITIVE_DATA]`.
- **High-Volume Log Sampling**: To control logging aggregation costs and prevent write IO bottlenecking during peak events, logs under `DEBUG` or standard `INFO` HTTP telemetry undergo rate-limited sampling (capturing a configurable 10% of standard operations, while keeping 100% of exceptions, `WARN`, and `ERROR` events).

---

## 2. Real-Time Application Performance Monitoring (APM) (7.2)

Uptime and performance parameters are continuously captured through dedicated health endpoints, service monitors, and background system hooks.

### 2.1 Health Checks Endpoint (`/api/health`)
Provides internal sub-component checks returning standard `200 OK` or `503 Service Unavailable`:

```json
{
  "status": "healthy",
  "version": "5.0.0-GA",
  "timestamp": "2026-06-17T20:30:15Z",
  "services": {
    "database": {
      "status": "connected",
      "latencyMs": 3.1
    },
    "redisTaskQueue": {
      "status": "connected",
      "pendingJobsCount": 12
    },
    "geminiAI": {
      "status": "healthy",
      "responseCheckMs": 142
    }
  }
}
```

### 2.2 Latency Percentile Analytics (p50, p95, p99)
Execution time is computed iteratively and compiled using Prometheus client wrappers to report key service intervals:
- **p50 (Median Performance)**: Typically sub-20ms. Reflects static asset delivery and cached ticket views.
- **p95 (Standard Operations)**: Typically sub-150ms. Represents write operations containing DB insert transactions.
- **p99 (High-Complexity Ops)**: Target cap at 800ms. Represents complex visual summaries, multi-line SLA computations, and PDF exports.

### 2.3 System Core Resources Ingestion
- **CPU & Memory Tracking**: Periodically hooks into standard `process.cpuUsage()` and `process.memoryUsage()`. Fills operational dashboards tracking **RSS (Resident Set Size)**, **Heap Total**, and **Heap Used**.
- **Disk Space Ingestion**: Scans local file uploads directory (`/uploads/`) space limits. If directory storage consumption exceeds `85%`, an automated disk-alert triggers.
- **Cache Hit Ratio (Redis/Local)**: Captures cache-access metrics:
  $$\text{Hit Ratio} = \frac{\text{Cache Hits}}{\text{Cache Hits} + \text{Cache Misses}} \times 100$$
  If hit ratios on high-volume ticket caches fall below `60%`, alerts flag cache-invalidation anomalies.

---

## 3. Profiling, Regression Detection & Diagnostics (7.3)

Aurelia Ops implements diagnostic routines to profile memory utilization, detect bottlenecks, and evaluate database query cost.

### 3.1 Database Query Execution Profiling
Every query mapped via Drizzle ORM evaluates execution time.
- If a database query exceeds a configurable performance threshold (typically `100ms`), the system automatically prints a warning log containing:
  - The calculated SQL execution duration.
  - The parameterized SQL statement (with target variables bound to prevent logging secrets).
  - A stack trace pointing back to the file and line number that initiated the database call.

### 3.2 Continuous CPU Profiling & Heap Snapshots
Aurelia includes safe command triggers to generate profiling files under stress conditions:
- **CPU Flame Graph Generation**: Developers with `Admin` clearance can issue an execution profile dump command to output v8 profile structures compatible with Chrome DevTools or Speedscope analyzers.
- **Heap Diagnostics**: In case of memory growth anomalies, heap diagnostics monitor allocations:
  ```typescript
  import v8 from "v8";
  import fs from "fs";

  export function writeHeapSnapshot() {
    const filename = `/uploads/heap-${Date.now()}.heapsnapshot`;
    v8.writeHeapSnapshot(filename);
    console.warn(`[Observability] Disk diagnostic written: Heap snapshot saved to ${filename}`);
  }
  ```

---

## 4. Crash Analytics & Error Tracking (7.4)

Sentry is integrated as our primary visual crash reporter to group incidents, measure trends, and guide immediate remediation.

### 4.1 Grouping, Deduplication, and Environment Context
- **Sentry Error Deduplication**: Errors are grouped mathematically by evaluating exception stacks. Recurring failures (e.g. `SMTP Socket Hangup`) do not flood dashboards with unique entry slots.
- **Client App SDK Configuration**:
  ```typescript
  import * as Sentry from "@sentry/react";

  Sentry.init({
    dsn: process.env.VITE_SENTRY_DSN,
    integrations: [
      new Sentry.BrowserTracing(),
      new Sentry.Replay()
    ],
    tracesSampleRate: 0.1,
    replaysSessionSampleRate: 0.05,
    replaysOnErrorSampleRate: 1.0, // Instantly capture 100% of user flow on UI error
    environment: "production"
  });
  ```
- **Context Injection**:
  Every error payload is automatically decorated with:
  - Active user session variables (excluding password parameters) via `Sentry.setUser`.
  - Deployment release hashes (`release: "aurelia-ops@5.0.0"`).
  - Client details: browser type, hardware architecture, and current workspace ID tags.

---

## 5. V5-Specific System Monitoring & SLAs Rules (7.5)

V5 introduces complex task operations. We implement dedicated telemetry streams to assure performance across business processes.

### 5.1 SLA Compliance monitoring & Breach Alerting
- Real-time SLA checkers continuously scan open tickets against deadline coordinates.
- **SLA Breach Warnings**: If active tickets exceed `slaResolutionDeadline - 15 minutes` without a status transition to `resolved` or `closed`, a system alarm triggers. The event sends prioritized Webhook reports to alert Slack queues or on-call paging clients.

### 5.2 Automation Operations telemetry
To prevent infinite automation routing issues or execution blockages, our workflow engine isolates and measures task telemetry:
- **Automation Pipeline Logging**: Every trigger-action event records execution metrics:
  ```json
  {
    "event": "automation.executed",
    "ruleId": "rule-auto-assign-vip",
    "name": "Auto-assign VIP High priority ticket",
    "trigger": "ticket.created",
    "durationMs": 14.2,
    "status": "success",
    "actionsCount": 2,
    "auditRecordId": "aud-1299-88a"
  }
  ```
- **Infinite Loop Guardrail**: Each worker process tracks execution depth of related events. If ticket automation events chain sequentially more than `5 times` inside 10 seconds, the workflow engine triggers an emergency halt, flags the rule as disabled, and logs an prioritized administrative exception.

### 5.3 Knowledge Base Query Latency & Search Precision
- **Search Performance Tracking**: We monitor standard keyword (lexical) search times vs. semantic fallback queries. Let our search system capture latency metrics to detect slow queries before they hit a critical index count.
- **KB Article Usage Stats**: Tracks views, client feedback thumbs up/down, and search redirect metrics. If articles receive a low helpfulness ratio, content owners receive an automated review notification.
- **Customer Data Audit Logging**: Captures every instance where users access premium CRM data inside client segments. Satisfies GDPR and compliance auditing targets by registering standard actor trace footprints securely.
