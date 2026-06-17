# Aurelia Ops Enterprise API Reference and Reference Design

Welcome to the **Aurelia Ops Enterprise REST API Documentation**. This manual contains detailed, formal descriptions of the API endpoints, error code structures, client integrations, security policies, schemas, and usage examples to ensure seamless integration.

---

## 1. OpenAPI 3.0 / Swagger Specification

Aurelia Ops ships with a fully realized OpenAPI v3.0 JSON specification describing every available endpoint and route context. 

Below is the OpenAPI specification defining our core authentication and workspace services.

```json
{
  "openapi": "3.0.3",
  "info": {
    "title": "Aurelia Ops API Platform",
    "description": "Enterprise-grade Helpdesk and SLA Orchestration Engine",
    "version": "5.0.0-GA",
    "contact": {
      "email": "architecture@aurelia.io"
    }
  },
  "servers": [
    {
      "url": "https://api.aurelia.io/api",
      "description": "Production Cloud Gateway"
    },
    {
      "url": "http://localhost:3000/api",
      "description": "Local Development Sandbox"
    }
  ],
  "paths": {
    "/auth/login": {
      "post": {
        "summary": "Authenticate User session",
        "description": "Submits user credentials to obtain an access and refresh token. Triggers multi-factor verification block if enabled.",
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/LoginRequest"
              }
            }
          }
        },
        "responses": {
          "200": {
            "description": "Authentication Succeeded",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/AuthSuccessResponse"
                }
              }
            }
          },
          "202": {
            "description": "MFA Challenge Required",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/MfaChallengeResponse"
                }
              }
            }
          },
          "401": {
            "description": "Bad Credentials / Invalid Access Code"
          }
        }
      }
    },
    "/workspaces/{workspaceId}/tickets": {
      "get": {
        "summary": "Query Workspace Tickets",
        "parameters": [
          {
            "name": "workspaceId",
            "in": "path",
            "required": true,
            "schema": { "type": "string" }
          },
          {
            "name": "status",
            "in": "query",
            "required": false,
            "schema": { "type": "string", "enum": ["open", "pending", "resolved", "closed"] }
          }
        ],
        "responses": {
          "200": {
            "description": "Array of matching tickets",
            "content": {
              "application/json": {
                "schema": {
                  "type": "array",
                  "items": { "$ref": "#/components/schemas/Ticket" }
                }
              }
            }
          }
        }
      }
    }
  },
  "components": {
    "schemas": {
      "LoginRequest": {
        "type": "object",
        "required": ["email", "password"],
        "properties": {
          "email": { "type": "string", "format": "email" },
          "password": { "type": "string" }
        }
      },
      "AuthSuccessResponse": {
        "type": "object",
        "properties": {
          "accessToken": { "type": "string" },
          "refreshToken": { "type": "string" },
          "user": {
            "type": "object",
            "properties": {
              "id": { "type": "string" },
              "email": { "type": "string" },
              "fullName": { "type": "string" },
              "mfaEnabled": { "type": "boolean" }
            }
          }
        }
      },
      "MfaChallengeResponse": {
        "type": "object",
        "properties": {
          "mfaRequired": { "type": "boolean", "example": true },
          "email": { "type": "string" },
          "userId": { "type": "string" }
        }
      },
      "Ticket": {
        "type": "object",
        "properties": {
          "id": { "type": "string" },
          "title": { "type": "string" },
          "description": { "type": "string" },
          "status": { "type": "string" },
          "priority": { "type": "string" },
          "slaBreachTime": { "type": "string", "format": "date-time" }
        }
      }
    },
    "securitySchemes": {
      "BearerAuth": {
        "type": "http",
        "scheme": "bearer",
        "bearerFormat": "JWT"
      }
    }
  }
}
```

To run interactive visual tests, point any local Swagger UI or Redoc client instance to `/docs/api/openapi.json`.

---

## 2. API Endpoint Schemas & Response Examples

Aurelia Ops maps all actions to well-regulated request payloads and JSON structures. Below are verified JSON contracts for critical endpoints:

### 2.1 Ticket Creation (POST `/api/workspaces/:workspaceId/tickets`)
- **Request Body Schema**:
```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "title": "CreateTicketSchema",
  "type": "object",
  "properties": {
    "title": { "type": "string", "minLength": 5, "maxLength": 150 },
    "description": { "type": "string" },
    "customerId": { "type": "string" },
    "priority": { "type": "string", "enum": ["low", "medium", "high", "urgent"] },
    "tags": { "type": "array", "items": { "type": "string" } }
  },
  "required": ["title", "description", "customerId", "priority"]
}
```
- **Example Success Response (201 Created)**:
```json
{
  "success": true,
  "ticket": {
    "id": "tkt-77a8b9c2",
    "workspaceId": "ws-23",
    "title": "Database degradation on production node alpha",
    "description": "Latency spiking during multi-tenant bulk reads.",
    "status": "open",
    "priority": "urgent",
    "customerId": "cust-ef98",
    "assignedTo": null,
    "createdAt": "2026-06-17T13:45:00Z",
    "updatedAt": "2026-06-17T13:45:00Z",
    "slaResponseDeadline": "2026-06-17T14:15:00Z",
    "slaResolutionDeadline": "2026-06-17T17:45:00Z"
  }
}
```

---

## 3. Interactive API Playground

Developers can invoke operations directly in real-time. To make it highly interactive:
1. **Interactive Shell**: Utilize the built-in Sandbox CLI inside the Aurelia Developer console.
2. **Authorized Fetch Console**: Run standard HTTP queries with pre-populated session contexts.
3. **Environment Tokens**: Generate a Developer API Key in **Aurelia Ops Admin Settings -> API Access**.

*Invoking a manual status test via the dev-playground terminal-tool:*
```bash
curl -X POST https://api.aurelia.io/api/workspaces/ws-23/tickets/tkt-77a8b9c2/messages \
  -H "Authorization: Bearer YOUR_PLAYGROUND_DEV_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{ "body": "Analyzing telemetry logs, status code confirms CPU drop" }'
```

---

## 4. Endpoints Deprecation Notices & API Lifecycle

As Aurelia Ops transitions from V4 to V5, we adhere to strict deprecation rules:

```
[REST Route]                      [Lifecycle Status]  [Sunset Deadline] [V5 Replacement URL]
GET /api/workspaces/:id/old-sla   DEPRECATED          2026-10-31        GET /api/workspaces/:id/sla
POST /api/auth/legacy-otp         DEPRECATED          2026-08-15        POST /api/auth/mfa/verify
```

When invoking deprecated routes, the platform auto-injects standard warning headers:
- `Deprecation: @deprecated/@v4-legacy`
- `Sunset: 2026-08-15`
- `Link: <https://api.aurelia.io/docs/v5-transition>; rel="successor-version"`

---

## 5. Formalized Error Responses

When a REST action suffers validation or transactional exceptions, Aurelia Ops issues structured JSON blocks:

### 5.1 Error Data Contract
```json
{
  "success": false,
  "error": {
    "code": "SLA_POLICY_BREACHED",
    "message": "The system cannot override priority because the target SLA tier dictates strict ownership boundaries.",
    "requestId": "4fa817c0-ee92-41ba-ac12-db07a90f38b1",
    "details": [
      {
        "field": "priority",
        "issue": "Setting priority to 'low' defeats agreed-upon Enterprise SLA guarantees."
      }
    ]
  }
}
```

### 5.2 System Code Taxonomy
- `AUTH_SESSION_EXPIRED` (401): JWT lifespan has terminated. Must run token exchange.
- `AUTH_INVALID_MFA` (400): Authenticator checksum verification failed.
- `SLA_MISSING_TARGET` (422): Unable to assign SLA due to unspecified customer tiers.
- `RATE_LIMIT_EXCEEDED` (429): API threshold reached for client identifiers.

---

## 6. Authentication Requirements & Lifecycle

The platform uses dual-lifecycle tokens to combine speed and strict access:

```
  +--------------+               +---------------+
  | CLIENT       |               | AUTH GATEWAY  |
  +--------------+               +---------------+
         |                               |
         |----- POST /auth/login ------->|
         |<---- JWT + Refresh Cookie ----|
         |                               |
    [Calls Routes]                       |
         |--- Bearer xxxxxxxx ---------->| (Validated locally via JWT keys)
         |<-- 200 JSON Success ----------|
         |                               |
    [Access expires (15 mins)]           |
         |--- POST /auth/refresh ------->| (Validates JTI session lifecycle in DB)
         |<-- New Access Token ----------|
         |                               |
```

- **Access Token**: HMAC SHA-256 JWT, expires in `15 minutes`.
- **Refresh Token**: Persistent cryptographically signed JTI uuid stored securely inside HttpOnly, SameSite=Strict cookies; lifetime is capped at `7 days`.
- **MFA Session Locking**: If MFA is enabled on an account, all core resources are systematically blocked until the client provides a corresponding high-security verification or validated backup code.

---

## 7. Rate Limiting, Limits, and Quotas

To prevent denial-of-service attempts and secure database stability, limits are applied at the network edge:

- **Tier Performance Quotas**:
  - **Free Plans**: 200 request metrics per hour.
  - **Developer Sandbox**: 1,200 request metrics per hour.
  - **Enterprise Tiers**: 50,000 request metrics per hour.
- **API Payloads Ceiling**: Under Express middleware configuration, incoming JSON buffers cannot exceed `4MB`. Bulk attachments must bypass JSON payloads and route through `/api/attachments/upload` multipart stream APIs.
- **Rate Limit Response Headers**:
  - `X-RateLimit-Limit`: Maximum requests permitted.
  - `X-RateLimit-Remaining`: Available balance before temporary lock.
  - `X-RateLimit-Reset`: Unix Timestamp indicating window termination.

---

## 8. Webhook Payloads and Notifications

Aurelia Ops feeds live workflow updates to corporate webhook callbacks (e.g. communication with messaging queues or event collectors).

### 8.1 Ticket Updated Hook payload (`ticket.updated`)
- **JSON Structure**:
```json
{
  "event": "ticket.updated",
  "timestamp": "2026-06-17T20:30:15Z",
  "signature": "t=17812903,v1=98bc3ef8d48e894c8b2",
  "data": {
    "id": "tkt-12345",
    "changes": {
      "status": {
        "previous": "open",
        "current": "pending"
      }
    }
  }
}
```
- **Signature Security**: Webhooks send a `X-Aurelia-Signature` header computed as an HMAC SHA-256 of the raw body payload via your workspace-specific webhook secret (validate signatures to screen fake triggers).

---

## 9. GraphQL Architectural Coexistence

While REST is the architectural standard of the Aurelia support routing tree, specific components (like complex bento-grid analytics charts) coexist with an embedded read-only GraphQL querying scheme.

```graphql
type SLAComplianceStats {
  workspaceId: ID!
  activeBreachCount: Int!
  metPercentage: Float!
}

type Query {
  getWorkspaceSLACompliance(workspaceId: ID!): SLAComplianceStats
}
```
To query GraphQL-driven telemetry logs, authenticate your request using the standard HTTP Authorization header and target `/api/graphql`.

---

## 10. API Client Code Snippets

```typescript
// Production API Client implementation for Aurelia Support Nodes
import axios from "axios";

export interface AureliaClientConfig {
  baseUrl: string;
  authToken: string;
}

export class AureliaOpsClient {
  private api;

  constructor(config: AureliaClientConfig) {
    this.api = axios.create({
      baseURL: config.baseUrl,
      headers: {
        "Authorization": `Bearer ${config.authToken}`,
        "Content-Type": "application/json"
      }
    });
  }

  public async getTickets(workspaceId: string, status?: string) {
    const params = status ? { status } : {};
    const response = await this.api.get(`/workspaces/${workspaceId}/tickets`, { params });
    return response.data;
  }

  public async createTicket(workspaceId: string, ticketData: any) {
    const response = await this.api.post(`/workspaces/${workspaceId}/tickets`, ticketData);
    return response.data;
  }
}
```

---

## 11. API Troubleshooting Guide

- **Error: `Invalid JWT JTI or session revoked`**
  - *Root Cause*: The session was destroyed (either because of security panics, multi-location reuse attempts, or manual logout).
  - *Fix*: Call POST `/api/auth/login` to obtain a brand new refresh and access token block.
- **Error: `Security validation failed. Access denied.` (MFA Verification Failure)**
  - *Root Cause*: The code was incorrectly formatted, or the time-skew on the token exceeded safe evaluation thresholds (+/- 30 seconds).
  - *Fix*: Synchronize user device clocks with global UTC and verify that backup codes are input exactly as written (backup-code verification logic automatically strips hyphens and converts characters to uppercase).
- **Error: `Payload too large`**
  - *Root Cause*: An attempt was made to post base64 encoded binaries inside `/tickets` JSON.
  - *Fix*: Route your files through the specialized multi-part attachments endpoint `/api/attachments/upload`.
