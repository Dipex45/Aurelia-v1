# Aurelia Ops Enterprise Error Handling, Resilience, and Concurrency Specification

This document details the official architectural specification for **Aurelia Ops Error Handling, Resilience Systems, Concurrency Control, and Concurrency/Conflict Resolution Models**. It forms our operational guidelines for fault isolation, circuit breakers, transaction boundaries, and self-healing systems.

---

## 1. Domain-Driven Error Classification & Handling (10.1)

Aurelia Ops implements a centralized, domain-specific exception model. The framework prevents raw database errors or stack leaks from reaching the browser by standardizing error categories.

### 1.1 Enterprise Error Classification Hierarchy
All custom API exceptions extend a base `ApiError` offering standard HTTP transport parameters:

```typescript
export class ApiError extends Error {
  constructor(
    public statusCode: number,
    public code: string,
    public override message: string,
    public details: any[] = []
  ) {
    super(message);
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }
}

// Domain Specific Exceptions
export class ValidationError extends ApiError {
  constructor(message: string, details: any[] = []) {
    super(400, "VALIDATION_FAILED", message, details);
  }
}

export class AuthenticationError extends ApiError {
  constructor(message: string = "Authorization rejected") {
    super(401, "AUTH_REJECTED", message);
  }
}

export class ServiceAgreementError extends ApiError {
  constructor(message: string, code: string = "SLA_VIOLATION") {
    super(422, code, message);
  }
}
```

### 1.2 Interactive Circuit Breaker & Exponential Backoff Pattern
For critical outgoing integrations (e.g. SMTP Gateways, Gemini AI requests, external webhooks), connections pass through our state-authoritative circuit breaker mechanism:

```typescript
export enum CircuitState {
  CLOSED, // Normal operations
  OPEN,   // Error threshold reached, calls blocked
  HALF_OPEN // Testing service recovery
}

export class CircuitBreaker {
  private state: CircuitState = CircuitState.CLOSED;
  private failureCount = 0;
  private lastStateChange: number = Date.now();
  
  constructor(
    private threshold = 5,
    private cooldownMs = 60000
  ) {}

  public async execute<T>(action: () => Promise<T>, fallbackResponse: T): Promise<T> {
    const now = Date.now();

    if (this.state === CircuitState.OPEN) {
      if (now - this.lastStateChange > this.cooldownMs) {
        this.transitionTo(CircuitState.HALF_OPEN);
      } else {
        console.warn("[CircuitBreaker] Request blocked. Route is currently OPEN.");
        return fallbackResponse;
      }
    }

    try {
      const result = await action();
      if (this.state === CircuitState.HALF_OPEN) {
        this.transitionTo(CircuitState.CLOSED);
      }
      return result;
    } catch (err) {
      this.handleFailure();
      return fallbackResponse;
    }
  }

  private transitionTo(newState: CircuitState) {
    this.state = newState;
    this.lastStateChange = Date.now();
    if (newState === CircuitState.CLOSED) {
      this.failureCount = 0;
    }
    console.warn(`[CircuitBreaker] State transitioned to: ${CircuitState[newState]}`);
  }

  private handleFailure() {
    this.failureCount++;
    if (this.state === CircuitState.CLOSED && this.failureCount >= this.threshold) {
      this.transitionTo(CircuitState.OPEN);
    }
  }
}
```

### 1.3 Adaptive Retry with Exponential Backoff
When calling external interfaces, requests use jittered exponential retry algorithms:

$$\text{Delay} = \text{Base} \times 2^{\text{attempt}} + \text{random\_jitter}$$

This prevents the "thundering herd" problem on remote servers.

---

## 2. Platform Resilience & Self-Healing Architecture (10.2)

To preserve uninterrupted service delivery under intensive support ticketing workloads, we enforce strict self-healing standards.

### 2.1 Graceful Shutdown Protocol
When receiving termination signals (`SIGINT`, `SIGTERM`), the web application conducts an orderly shutdown:
1. **Ingress Stop**: Immediately signals Nginx proxies to route new traffic requests to adjacent cluster nodes.
2. **In-Flight Draining**: Permits active HTTP requests to complete within a `30-second` grace envelope.
3. **Resource Safe Close**: orderly terminates active PostgreSQL connection pools and halts background task queue worker engines.
4. **Orderly Exit**: Returns code `0` to signal safe orchestration environments.

### 2.2 Startup Validation & Self-Healing Guards
Upon node boot, blocking validation rules verify the correctness of the runtime environment:
- **Connectivity Check**: Verifies active connection capability to target PostgreSQL nodes.
- **Drizzle Schema Assertions**: Asserts database schema structural consistency.
- **Uploads Dir Validation**: Creates missing uploads directories with proper user ownership scopes.

---

## 3. Concurrency, Consistency, and Transaction Integrity (10.3)

Aurelia Ops enforces strict transactional boundaries, preventing data race conditions and ensuring eventual consistency.

### 3.1 Optimistic Locking Pattern
For high-contention models (like Ticket Assignments and Customer records), we use **Optimistic Locking** to block concurrent override attempts.
The target table retains a numeric `version` column. When applying changes, the update query asserts that the version matches the read state:

```sql
UPDATE tickets 
SET status = 'resolved', version = version + 1 
WHERE id = 'tkt-123' AND version = 3;
```
If the execution returns a zero row-count match, the action throws a `409 ConcurrencyConflictException`. The system catches this conflict and triggers a retry:
1. Re-reads the updated database row state.
2. Merges safe user-defined edits.
3. Re-applies the write action with the latest version pointer.

### 3.2 Pessimistic Queue Locking & Isolation
For complex ledger updates or financial billing transitions, tables are locked using transaction isolation rules:
- **Isolation Scope**: Transactions utilize **Read Committed** boundaries by default.
- **Row-Level Allocation Locks**: Utilizing native PostgreSQL lock-strategies for exclusive seat updates (`SELECT ... FOR UPDATE`), preventing simultaneous executions on duplicate operations.

---

## 4. V5-Specific Automation & Engine Resilience (10.4)

V5-specific workflows (such as Service Agreement evaluations and dynamic Workflow Automations) include dedicated fault-tolerance controls.

### 4.1 SLA Recalculation Fallback
- If a high-efficiency SLA evaluation crashes due to an unhandled exception or database connection drop during recalculation, the transaction rolls back safely.
- The engine logs the incident and falls back to our **Basic SLA Ruleset Baseline** (24-hour response / 72-hour resolution deadlines). This preserves the ticket lifecycle until manual reviews are triggered.

### 4.2 Automation Timeout Guardrails & State Rollback
- To prevent slow scripts or infinite loops from blocking background threads, all custom automations are wrapped in a **3000ms execution timeout**.
- If a workflow exceeds this duration, the pipeline throws an option exception, terminates execution, and rolls back all database column alterations made during that transaction.

### 4.3 Knowledge Base (KB) Corruption Recovery
- The support knowledge index automatically monitors hash integrity.
- If a storage corruption event is detected during article operations, the search engine halts lexical lookups and initiates a full reindex workflow. During this transition, client requests fallback transparently to search archives, preserving ticket flow.

### 4.4 Automated Segments Rebuilding
- Customer classification segments rebuild continuously inside our worker node queue.
- If a worker process fails midway through segment updates, the database retains the existing segment records. This guarantees that customer profiles are never left blank due to partial segment execution failures.
