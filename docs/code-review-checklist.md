# Aurelia Ops Quality & Code Review Checklist

This checklist defines standard procedures during merge request visual inspection and architectural compliance verification.

## 1. Security & Compliance
- [ ] **Input Cleansing**: All HTTP inputs must pass through Zod schemas verified at boundaries.
- [ ] **Rate Limiting**: Critical public-facing endpoints (e.g., login, registering, MFA Verification) must be gated behind IP rate limiting.
- [ ] **Data Protection**: Secrets (e.g., Resend, AWS S3, Stripe secret keys) must never be checked into git. Ensure they are placed solely in `.env` and documented in `.env.example`.
- [ ] **Cryptographic Safety**: Passwords must be hashed using `argon2`. Keep salt factors optimal and robust.
- [ ] **Audit Trail logging**: Critical events (e.g. workspace creation, customer deletion, billing updates, user registration verification) must trigger systematic events written to audit structures.

## 2. Code Elegance & Separation of Concerns
- [ ] **No Tech Larping / Margin Clutter**: Avoid status placeholders, system ports, telemetry, or network-ping markers in production client code except where directly requested.
- [ ] **Strict Modular Architecture**: Separate business rules from route controllers.
- [ ] **Single View Boundary**: Basic widget operations should live in elegant, single-view containers. Complete modular applications map views to clear nested routes.
- [ ] **Early Returns**: Check inputs and handle errors at the top of functions; minimize deep nested `if-else` cycles.

## 3. Performance & Stability
- [ ] **Database Connection Pooling**: Drizzle + Postgres client connection pools must handle limits correctly under loads.
- [ ] **Index Strategy**: Check `schema.ts`. Verify frequently questioned columns (e.g., ticket assignee, customer primary email, workspace slug) are index-reinforced.
- [ ] **React Hooks**: Avoid missing dependency arrays in `useEffect`, `useMemo`, and `useCallback` that risk endless re-rendering logic loops.

## 4. Testing
- [ ] **Unit Assertions**: Ensure services feature reliable mockup parameters.
- [ ] **E2E / Integration Tests**: New operations must have coverage in vitest integration suites before merges.
