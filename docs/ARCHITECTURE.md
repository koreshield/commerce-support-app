# Architecture

## Request lifecycle

```text
synthetic customer message
          │
          ▼
  Koreshield input scan ──────────────── block before AI
          │ allow
          ▼
 tenant-scoped knowledge retrieval
          │
          ▼
 Koreshield context scan ─────────────── block before AI
          │ allow
          ▼
   AI response and tool proposal
          │
          ▼
  Koreshield action scan ─────────────── block proposal
          │ allow / observe
          ▼
 host authorization and tenant check ── reject proposal
          │
          ├── read-only tool ─────────── execute in sandbox
          └── mutation ───────────────── await operator approval
```

The security provider and AI provider are interfaces with deterministic and live implementations. Simulator mode is the default so the same scenario produces a predictable result without external dependencies.

## Server boundaries

- `src/lib/server/workflow.ts` owns orchestration and fail-safe completion.
- `src/lib/server/security.ts` adapts simulator or Koreshield decisions to one internal shape.
- `src/lib/server/ai.ts` adapts deterministic or OpenAI generation.
- `src/lib/server/tools.ts` owns application authorization and sandbox execution.
- `src/lib/server/repository.ts` owns schema, seed data, tenant-scoped reads, and the audit trail.
- `src/app/api` exposes narrow route handlers to run, approve, reset, and inspect the demo.

Provider credentials are read only in server modules. Browser components receive status and evidence, never keys.

## Data model

SQLite contains tenants, customers, orders, knowledge documents, conversations, messages, workflow runs, security events, and action proposals. IDs crossing trust boundaries are represented as branded types in the TypeScript domain model.

The database defaults to `data/commerce-support.sqlite`. Tests create isolated in-memory repositories. `npm run demo:reset` replaces the demo state with a known synthetic baseline.

## Decision ordering

Koreshield and host authorization answer different questions:

- Koreshield evaluates whether content or a proposed action looks unsafe.
- The host decides whether the current tenant and support role are allowed to access the target and tool.
- The operator decides whether an allowed mutation should execute.

The host checks are never disabled by detect mode. This keeps the demo honest: a security layer adds defense in depth but does not replace authorization.

## Failure behavior

Malformed provider responses, timeouts, and unexpected workflow failures end the run with a safe failure status. A blocked input or context never reaches the AI provider. A blocked action never reaches a tool. The evidence view keeps boundary decisions and provider provenance for inspection.
