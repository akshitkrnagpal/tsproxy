# tsproxy example: Next.js Pages Router (embedded)

Same marketplace UI as `../app-router`, wired up via the Pages Router
so you can see how the embedded handler slots into a classic
`pages/api` route.

## What it exercises

- `@tsproxy/api/nextjs` `createPagesRouterHandler` mounted at
  `pages/api/tsproxy/[[...path]].ts`.
- `@tsproxy/react` components against a relative `/api/tsproxy` URL.
- Shared `tsproxy.config.ts` consumed by both the handler and the
  `pnpm seed` script.

## Prerequisites

Run a Typesense instance locally. From the repo root:

    docker compose up -d

That brings up Typesense on `localhost:8108` with API key
`test-api-key` (matches the default in `tsproxy.config.ts`).

## Run

    pnpm install         # from the monorepo root
    pnpm dev             # from this example — starts on :3002
    pnpm seed            # in a second terminal, one-shot

Open <http://localhost:3002>.

## Key differences vs `../app-router`

- Handler lives in `pages/api/tsproxy/[[...path]].ts` instead of
  `app/api/tsproxy/[[...path]]/route.ts`.
- `config.api.bodyParser = false` on the handler file — Next's
  default body parser would consume the request stream before the
  adapter can forward it.
- No `"use client"` boundary needed; the Pages Router renders the
  whole tree client-side after hydration so InstantSearch just works.

## Files worth reading

- `pages/api/tsproxy/[[...path]].ts` — the embedded handler.
- `pages/index.tsx` — the InstantSearch UI.
- `scripts/seed.ts` — one-shot bulk import (identical to App Router).
