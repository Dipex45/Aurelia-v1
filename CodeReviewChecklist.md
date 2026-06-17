# Aurelia Ops Team Code Review Checklist

This checklist describes the checks that must be performed as part of every merge request.

## 1. Compliance & Static Analysis
- [ ] Code has no linting or TypeScript compilation warnings (`npm run lint` completes cleanly).
- [ ] Strict types are adhered to (avoid placing `any` where a concrete type can be derived).
- [ ] `.editorconfig` style and indentation (2 spaces) are followed consistently.
- [ ] No magic numbers or strings have been introduced (magic constants moved to dedicated `.ts` files).

## 2. Security & Guardrails
- [ ] Input schemas have strict Zod verification validators attached.
- [ ] API routes process permissions cleanly via roles (`PermissionProxy` or custom middleware).
- [ ] Internal JWT mechanisms and secure cookies (with appropriate expiration limits) are handled strictly.
- [ ] Secret API keys are not exposed to client bundles under any circumstances.

## 3. Architecture & Separation of Concerns
- [ ] Business logics reside cleanly inside domain patterns (or services) rather than direct routing controller blocks of Express.
- [ ] Data queries are modularized (e.g., using `TicketRepository`, `CustomerRepository`, or a `TicketQueryBuilder`).
- [ ] Event transactions use the event bus patterns (`domainEventPublisher`) to avoid tight decoupling.

## 4. UI Polish & Usability
- [ ] Screen layouts support fluid responsive grids (`sm:`, `md:`, `lg:` classes checked).
- [ ] Colors use high contrast palettes adhering to the primary visual guidelines.
- [ ] Components are modular and small (e.g., `<SlaTimerBadge />`, `<ArticleViewerCard />`).
