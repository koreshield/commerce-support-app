# Cloudflare Workers deployment

The production Worker uses OpenNext for the Next.js runtime and D1 for durable synthetic demo state. The local Next.js server uses Wrangler's local D1 emulator. Node.js standalone and Docker deployments retain the SQLite adapter.

## Requirements

- Cloudflare account with Workers and D1 access.
- Wrangler authentication from `npx wrangler login`.
- A D1 database configured as `DB` in `wrangler.jsonc`.

## First deployment

Create the database and place the returned ID in `wrangler.jsonc`:

```bash
npx wrangler d1 create commerce-support-demo
```

Apply migrations remotely, validate the Worker bundle, and deploy:

```bash
npx wrangler d1 migrations apply commerce-support-demo --remote
npm run check
npm run test:e2e
npm run check:cloudflare
npm run cf:deploy
```

`check:cloudflare` verifies generated binding types, builds the OpenNext Worker, and runs Wrangler's deployment dry run.

## Local D1 development

```bash
npm run demo:prepare
npm run dev
```

Use `npm run demo:reset` to restore the local D1 baseline. The UI reset performs the same logical reset against whichever storage provider is active.

## Secrets

The default production deployment uses deterministic simulators and needs no secrets. Set live provider keys with Wrangler rather than committing them:

```bash
npx wrangler secret put KORESHIELD_API_KEY
npx wrangler secret put OPENAI_API_KEY
```

Provider selection and non-secret endpoint configuration should be reviewed and set deliberately before enabling either live adapter. A deployment must not receive real customer or order data.

## Rollback

Inspect versions before changing traffic:

```bash
npx wrangler versions list
npx wrangler deployments list
```

Roll back to a known version with `npx wrangler rollback <VERSION_ID>`, then verify `/api/health` and a clean scenario. D1 schema changes require their own forward migration or backup-based recovery; a Worker rollback does not revert database state.
