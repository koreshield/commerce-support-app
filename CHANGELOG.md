# Changelog

## Unreleased

- Renamed the product to Commerce Support across the interface and documentation.
- Reworked mobile navigation, scenario selection, evidence presentation, touch targets, and safe-area behavior.
- Connected the production Worker to an isolated Koreshield workspace in detect mode with a scan-only secret.
- Added a per-client rate limit to workflow, approval, and reset mutations.

## v2026.0.1.0 — 2026-09-01

First public demo release.

- Added 6 repeatable commerce-support scenarios covering normal traffic, direct prompt injection, poisoned retrieval, excessive refunds, cross-tenant access, and human-approved address changes.
- Added independent inspection boundaries for customer input, retrieved private context, and model-proposed actions.
- Added host-owned tenant authorization and approval-gated sandbox mutations.
- Added support, evidence, integration, and protected-workflow views for live demonstrations.
- Added deterministic simulation and optional Koreshield and OpenAI provider adapters.
- Added Cloudflare Workers deployment through OpenNext with durable D1 storage.
- Added strict TypeScript, workflow, desktop, mobile, overflow, and accessibility validation.
