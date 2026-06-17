# Aurelia Ops Naming Conventions Reference

This document outlines the engineering guidelines and naming conventions to enforce across our workspace codebase.

## 1. General Principles

- **No Single Letters (Except Loops):** Do not use abbreviations or single-letter variable names like `u` or `t`. Instead use `user` or `ticket`.
- **Consistent Abbreviations:** Use standard abbreviations explicitly (`res` for Response, `req` for Request, `err` for Error, `ctx` for Context).

## 2. Variables & Constants

- **String Constants / Enums:** Always prefer string union types or TypeScript `enum` declarations for constants rather than magic strings.
  ```typescript
  export enum TicketStatus {
    OPEN = "open",
    IN_PROGRESS = "in_progress",
    RESOLVED = "resolved",
    CLOSED = "closed"
  }
  ```
- **Type Prefixes for Identifiers (IDs):** IDs must carry descriptive prefixes or camelCase suffixes.
  - Correct: `userId`, `workspaceId`, `ticketId`, `customerId`
  - Incorrect: `uid`, `wid`, `id` (when referring to typed primary relationships)
- **Boolean Prefixes:** Booleans must be prefixed with a state verb indicating status:
  - Examples: `isActive`, `hasPermission`, `isExpired`, `isEnabled`, `canWrite`

## 3. UI Interactions & Callbacks

- **Handler Functions:** Callback handlers must be named after the action event they digest:
  - Correct: `handleClick`, `handleSubmit`, `onClose`, `onSubmit`, `onTicketChange`

## 4. Class Design

- **Private Members:** Mark any internal or private class members using a trailing or leading underscore where applicable, or native TypeScript private accessors (`private`).
- **Domain Service Suffixes:** Always append roles cleanly as suffixes:
  - Service classes: `TicketService`, `AuthService`
  - Controller classes: `AuthController`, `WorkspaceController`
  - Storage Layer: `TicketRepository`
