# Architectural Decision Record (ADR) - Core Design Patterns

- **Status**: Accepted
- **Author**: Aurelia Operations Arch board
- **Date**: 2026-06-08

## 1. Context and Problem Statement
Maintainability, speed, security, and cleanliness of Aurelia Ops support tickets, customer communications, SLAs, and automations are critical. We need a unified architectural reference of patterns implemented to scale features elegantly without regression.

## 2. Decided Architectural Patterns

### 2.1 Strictly Separated Validator Modules
- **Pattern**: Validator Separator Module Pattern
- **Decision**: Moving from a single massive `validation.ts` schema collection to a localized, domain-driven subdirectory `/src/server/shared/validators/`.
- **Justification**: Enhances file discovery, makes importing individual schemas granular, and prevents git conflict bottlenecks.

### 2.2 Repository and Data Mapper Separation
- **Pattern**: Repository Pattern
- **Decision**: Database querying mechanics must reside in specialized repositories (e.g. `UserRepository`, `TicketRepository`). Controllers must make requests through high-level service managers.
- **Justification**: Keeps schema structures decoupleable from the REST route lifecycle.

### 2.3 SLA Evaluation Strategy Matching
- **Pattern**: Strategy Design Pattern
- **Decision**: SLA compliance tracking should select and apply target calculations depending on policies associated with specific customer tiers or workspace agreements.
- **Justification**: Permits plugging in additional SLA rules without re-engineering existing calculation algorithms.

### 2.4 Event-Driven Audit Engine
- **Pattern**: Event Observer Pattern
- **Decision**: Systems register action telemetry asynchronously.
- **Justification**: Decouples primary ticket updates from persistent logging and telemetry operations.

## 3. Benefits and Impact
- **Developer Onboarding**: Clear code boundaries prevent visual confusion.
- **Quality Gates**: Linting checks, clean imports, and modular schemas allow parallel visual design iterations safely.
