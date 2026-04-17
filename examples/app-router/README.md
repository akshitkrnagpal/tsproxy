# tsproxy example: Next.js App Router (embedded)

A faceted marketplace search UI powered by an embedded `@tsproxy/api`
route handler. Next.js 16, App Router, no separate proxy server.

## What it exercises

- `@tsproxy/api/nextjs` `createAppRouterHandler` mounted at
  `/api/tsproxy/[[...path]]` — every tsproxy endpoint is served from
  the same Next.js host.
- `@tsproxy/react` SearchProvider + SearchBox + RefinementList +
  Pagination + Stats + SortBy + NoResults.
- Shared `tsproxy.config.ts` consumed by the route handler and the
  `pnpm seed` script so the schema lives in one place.

## Prerequisites

Run a Typesense instance locally. From the repo root:

    docker compose up -d

That brings up Typesense on `localhost:8108` with API key
`test-api-key` (matches the default in `tsproxy.config.ts`).

## Run

    pnpm install         # from the monorepo root
    pnpm dev             # from this example — starts on :3001
    pnpm seed            # in a second terminal, one-shot

Open <http://localhost:3001>. The first load shows an empty state
until `pnpm seed` completes.

## Try it out

- Type into the search box — results update live.
- Toggle facets on the left (Category, Brand, Color).
- Switch the sort dropdown (price asc/desc, rating).
- Paginate at the bottom.
- Hit `/api/tsproxy/api/docs` to see every embedded endpoint.

## Files worth reading

- `tsproxy.config.ts` — collection schema + cache / rate-limit config.
- `app/api/tsproxy/[[...path]]/route.ts` — the embedded handler.
- `app/SearchUI.tsx` — the InstantSearch UI.
- `scripts/seed.ts` — one-shot bulk import against the ingest endpoint.
