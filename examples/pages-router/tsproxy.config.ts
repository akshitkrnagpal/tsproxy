import { defineConfig } from "@tsproxy/api";

/**
 * Shared config for the embedded Next.js App Router example.
 *
 * Both the route handler (app/api/tsproxy/...) and the one-shot seed
 * script (scripts/seed.ts) import this file, so the schema stays in
 * one place. Talks to a local Typesense on :8108 — bring one up with
 * the root-level docker-compose.yml before running `pnpm dev`.
 */
export default defineConfig({
  typesense: {
    host: process.env.TYPESENSE_HOST ?? "localhost",
    port: Number(process.env.TYPESENSE_PORT ?? 8108),
    protocol: (process.env.TYPESENSE_PROTOCOL as "http" | "https") ?? "http",
    apiKey: process.env.TYPESENSE_API_KEY ?? "test-api-key",
  },

  server: {
    apiKey: process.env.TSPROXY_INGEST_API_KEY ?? "ingest-secret-key",
  },

  cache: { ttl: 60, maxSize: 1000 },
  queue: { concurrency: 5, maxSize: 10000 },
  rateLimit: { search: 100, ingest: 30 },

  collections: {
    products: {
      fields: {
        name: { type: "string", searchable: true },
        description: { type: "string", searchable: true, optional: true },
        price: { type: "float", sortable: true, facet: true },
        category: { type: "string", facet: true },
        color: { type: "string", facet: true },
        brand: { type: "string", facet: true },
        tags: { type: "string[]", facet: true, optional: true },
        in_stock: { type: "bool", facet: true },
        rating: { type: "float", sortable: true },
        created_at: { type: "int64", sortable: true },
      },
      defaultSortBy: "created_at",
    },
  },
});
