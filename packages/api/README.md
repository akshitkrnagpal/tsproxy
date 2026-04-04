# @tsproxy/api

HonoJS proxy server for [Typesense](https://typesense.org) with caching, rate limiting, and a BullMQ ingestion queue.

> **This project is under heavy development.**

## Install

```bash
npm install @tsproxy/api
```

## Usage

Create a `tsproxy.config.ts`:

```ts
import { defineConfig } from "@tsproxy/api";

export default defineConfig({
  typesense: {
    host: "localhost",
    port: 8108,
    apiKey: "your-api-key",
  },
  server: { port: 3000, apiKey: "your-ingest-secret" },
  cache: { ttl: 60, maxSize: 1000 },
  queue: { concurrency: 5, maxSize: 10000 },
  rateLimit: { search: 100, ingest: 30 },
  collections: {
    products: {
      fields: {
        name: { type: "string", searchable: true },
        price: { type: "float", sortable: true },
        category: { type: "string", facet: true },
      },
    },
  },
});
```

## Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `POST` | `/api/search` | No | InstantSearch-compatible multi-search |
| `GET` | `/api/health` | No | Health check (Typesense + Redis) |
| `POST` | `/api/ingest/:collection/documents` | Yes | Upsert document |
| `POST` | `/api/ingest/:collection/documents/import` | Yes | Bulk import |
| `PATCH` | `/api/ingest/:collection/documents/:id` | Yes | Partial update |
| `DELETE` | `/api/ingest/:collection/documents/:id` | Yes | Delete document |
| `GET` | `/api/ingest/queue/status` | Yes | Queue stats |

## Features

- LRU cache with configurable TTL (error-aware — never caches failures)
- Per-IP rate limiting
- BullMQ queue (Redis) with in-memory fallback
- Computed fields during ingestion
- Multilingual collection routing
- Config file with `defineConfig`

## Documentation

[tsproxy.akshit.io](https://tsproxy.akshit.io)

## License

MIT
