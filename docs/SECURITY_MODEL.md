# Security model

## Assets

The reference workflow protects customer messages, private merchant knowledge, order data, action authority, and the evidence trail. All included records are synthetic, but the boundaries mirror a production support system.

## Untrusted inputs

- Customer messages from web or messaging channels.
- Customer-supplied or compromised material returned by retrieval.
- Model-generated tool names and arguments.
- Live provider responses, which are validated at runtime before use.

## Controls

- Scan input, retrieved context, and proposed actions independently.
- Validate API request bodies with Zod and constrain domain values in TypeScript.
- Keep credentials and database access on the server.
- Scope reads and mutations by tenant.
- Deny tools the support agent does not own.
- Require human approval for state-changing actions.
- Disable real payment, messaging, and fulfillment providers.
- Record provider, mode, request ID, severity, confidence, latency, and outcome.

## Deliberate limitations

This lab does not implement production identity, role management, rate limiting, distributed audit storage, encryption-key management, deletion workflows, or incident response. It is not a substitute for client qualification or a production security review.

The deterministic simulator recognizes only the included demonstration patterns. It is useful for repeatability, not for measuring detection quality. Any claim about live Koreshield behavior must come from a configured live run and retained evidence.

## Live-demo checklist

Before enabling live providers, verify the exact API contract, endpoint reachability, tenant entitlement, key scope, retention behavior, and whether the provider may receive the synthetic content. Use a test tenant and a revocable key. Do not introduce client or production data into this application.
