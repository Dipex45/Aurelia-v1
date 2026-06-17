# Aurelia Ops Codebase Naming Conventions

This document establishes the official codebase naming conventions to ensure consistency, readability, and clean maintenance of the system.

## 1. File and Directory Naming

### 1.1 Directories
- All directories containing feature modules, shared files, or libraries must be named using **kebab-case** or plain lowercase.
- Examples: 
  - `src/features/audit`
  - `src/features/inbox`
  - `src/server/shared/validators`

### 1.2 Frontend Files (Components & Routes)
- **Component Files**: All React component files must use **PascalCase**.
  - Examples: `InboxPage.tsx`, `TicketDetailPage.tsx`, `Layout.tsx`
- **Hook Files**: Custom utility hooks must be prefixed with `use` and written in **camelCase**.
  - Examples: `useAsync.ts`, `useLocalStorage.ts`, `useDebounce.ts`

### 1.3 Backend Files (Services & Controllers)
- **Controllers & Services**: Must use suffix-appended format in **camelCase** or standard lowercase for folders, and naming suffix matching their role.
  - Examples:
    - `auth.controller.ts`
    - `email.service.ts`
    - `tickets.service.ts`

---

## 2. Variables, Constants, and Functions

### 2.1 Variables & Functions
- Use **camelCase** for local variables, instance members, and function declarations.
- Booleans should carry descriptive prefixes like `is`, `has`, `should`, or `can`.
  - Examples: `const isAgent = msg.senderRole === "agent";`, `const hasPermission = checkIfUserHasAccess(user);`
- Avoid single-letter variable names like `e`, `t`, `v` (except standard loop indices such as `i`, `j`).

### 2.2 Constant Values & Enumerated Types
- Global compile-time constants must be defined in **UPPERCASE_WITH_UNDERSCORES**.
  - Example: `const MAX_UPLOAD_SIZE = 10 * 1024 * 1024;`
- **Database schemas and schemas variables** must reflect their table entities correctly:
  - Example: `export const users = pgTable("users", ...)`
- Standard **TypeScript Enums** must be written in **PascalCase** for the type itself and inside values:
  - Example:
    ```typescript
    export enum TicketPriority {
      Low = "low",
      Medium = "medium",
      High = "high",
      Critical = "critical"
    }
    ```

### 2.3 Identity Suffixes
- Use explicit visual type suffixes for key IDs to clarify business domains:
  - Example: `userId`, `workspaceId`, `ticketId`, `customerId`.

---

## 3. Database & SQL Conventions
- Database tables and fields should use **snake_case** for table models and migration definitions to match PostgreSQL standards.
  - Examples: `created_at`, `password_hash`, `email_verified`, `customer_emails`
- Model classes and data interfaces must map to **camelCase** when returned from client-facing controllers.
