# Commerce Support Lab

A synthetic commerce-support application for demonstrating where Koreshield sits in a real AI workflow. It shows the complete path from an untrusted customer message, through private knowledge retrieval and model generation, to a proposed support action.

The lab is safe to run locally. Its default configuration is deterministic, uses invented customer data, and makes no network calls. Mutating tools require an explicit operator approval, and payment and messaging providers are intentionally absent.

## What the demo proves

The application makes three security boundaries visible:

1. **Input** — scan the customer message before retrieval or model inference.
2. **Context** — scan tenant-scoped knowledge before it enters the model prompt.
3. **Action** — scan the model's proposed tool call before application authorization and execution.

Six built-in scenarios exercise the normal path, direct prompt injection, poisoned retrieval, an excessive refund, a cross-tenant lookup, and a legitimate address change that needs human approval.

Application authorization is independent of Koreshield. In detect mode, Koreshield may observe a risky action without blocking it, but tenant isolation and tool permissions still apply.

## Quick start

Requirements: Node.js 22 or newer and npm.

```bash
npm ci
cp .env.example .env.local
npm run demo:reset
npm run dev
```

Open [http://localhost:3000](http://localhost:3000), select a scenario, and run the protected request.

The default environment uses the local security simulator and deterministic AI provider. No API keys are needed.

## Commands

```bash
npm run dev          # local development server
npm run demo:reset   # restore the synthetic baseline
npm run typecheck    # strict TypeScript validation
npm run lint         # ESLint validation
npm test             # workflow tests
npm run test:e2e     # desktop and mobile browser tests
npm run build        # optimized production build
npm run check        # typecheck, lint, unit tests, and build
```

For the first browser-test run, install Chromium with `npx playwright install chromium`.

## Run with Docker

```bash
docker compose up --build
```

The app is available at [http://localhost:3000](http://localhost:3000). The synthetic SQLite database is stored in the `demo-data` volume. Use **Reset workspace** in the UI to restore the baseline.

## Optional live providers

Copy `.env.example` to `.env.local` and opt into either provider explicitly:

```dotenv
DEMO_AI_PROVIDER=openai
OPENAI_API_KEY=...
OPENAI_MODEL=gpt-4o-mini

DEMO_SECURITY_PROVIDER=koreshield
KORESHIELD_API_URL=https://your-koreshield-host
KORESHIELD_API_KEY=...
KORESHIELD_MODE=enforce
```

Secrets remain server-side. If the requested provider is missing its required configuration, the application falls back to the deterministic simulator and reports the active provider in the Integration view.

Live Koreshield uses `POST /v1/scan`, `POST /v1/rag/scan`, and `POST /v1/tools/scan`. Check those request and response contracts against the Koreshield deployment you intend to demonstrate before using a real key.

## Safety boundary

- Every merchant, customer, order, message, and policy is synthetic.
- SQLite queries are scoped by tenant, and the host application repeats authorization before every action.
- Address updates mutate only the local synthetic database and require operator approval.
- Refund, cancellation, discount, export, and outbound-message integrations are not connected.
- Reset restores the known baseline for repeatable demos.
- This is a reference client and demonstration harness, not evidence that an external client has been qualified.

Read [the architecture](docs/ARCHITECTURE.md), [the demo script](docs/DEMO_SCRIPT.md), and [the security model](docs/SECURITY_MODEL.md) before presenting it.

## Technology

Next.js 16, React 19, strict TypeScript, SQLite, Vitest, and Playwright. The application can run as a standalone Node.js service or as a container.

## License

[MIT](LICENSE)
