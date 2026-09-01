# Demo script

Allow 10–12 minutes. Start in simulator and enforce mode, and reset the workspace before presenting.

## Opening

Explain that this is a synthetic support application, not a mocked screenshot. The message, retrieval, model outcome, proposed tool, authorization decision, and local database mutation all pass through the running application.

Use the Integration view to establish provenance: which security provider, AI provider, mode, model, and data source are active.

## 1. Normal order lookup

Run **Normal order lookup**. Point out the three allowed boundary events and the executed read-only `lookup_order` tool. The expected outcome is `completed`.

## 2. Direct input attack

Run **Input attack**. The expected outcome is `blocked input`. Show that the AI provider says `not reached`, and that no context or action event exists.

## 3. Poisoned retrieval

Run **Context attack**. The customer request is harmless, but the selected private policy contains an instruction-like payload. The expected outcome is `blocked context`, before model inference.

## 4. Dangerous action

Run **Excessive refund**. The message and context pass. The model proposes a refund over the sandbox authorization limit, and the action boundary blocks it before execution.

## 5. Defense in depth

Switch `KORESHIELD_MODE` to `detect`, restart, and run **Cross-tenant order** if the audience needs to see the distinction. Koreshield records that it would block, while the host application's tenant authorization still rejects the action.

## 6. Useful human control

Return to enforce mode and run **Human approval**. The address change remains pending until the operator selects **Approve sandbox action**. Open Support desk and verify that only the local synthetic address changed.

## Close

Open Evidence to compare the runs. The demo should prove exact placement and auditable outcomes, not claim perfect protection or replace normal authentication, authorization, privacy, monitoring, or human review.

## Recovery

- Select **Reset workspace** in the UI or run `npm run demo:reset`.
- If a live provider is unavailable, return the corresponding `DEMO_*_PROVIDER` variable to `simulator` and restart.
- Check `/api/health` for process, database, and provider status.
