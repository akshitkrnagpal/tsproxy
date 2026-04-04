# @tsproxy/cli

CLI for [tsproxy](https://github.com/akshitkrnagpal/tsproxy) — a Typesense search proxy framework.

> **This project is under heavy development.**

## Quick Start

```bash
npx @tsproxy/cli init
docker compose up -d
npx tsproxy dev
```

## Commands

```bash
tsproxy init         # Interactive project setup
tsproxy dev          # Start proxy in dev mode (hot reload)
tsproxy start        # Start proxy in production mode
tsproxy build        # Build for production
tsproxy seed <file>  # Seed data via the ingest API
tsproxy migrate      # Sync Typesense schema with config
tsproxy health       # Check Typesense + Redis status
```

## `tsproxy init`

Interactive setup that asks:

1. **What to set up** — Backend / Frontend / Both
2. **How you run Typesense** — Docker / Typesense Cloud / Self-hosted
3. **Persistent queue** — Redis (optional)
4. **Frontend framework** — React / Vanilla JS

Generates `tsproxy.config.ts`, `docker-compose.yml`, `.env`, and installs dependencies.

## `tsproxy migrate`

Diffs your `tsproxy.config.ts` collections against live Typesense schema:

```bash
npx tsproxy migrate          # dry run
npx tsproxy migrate --apply  # apply changes
npx tsproxy migrate --apply --drop  # drop and recreate
```

## `tsproxy seed`

Seeds data through the proxy's ingest API (applies computed fields, uses queue):

```bash
npx tsproxy seed products.json --collection products
npx tsproxy seed products.json --collection products --locale en
```

## Documentation

[tsproxy.akshit.io](https://tsproxy.akshit.io)

## License

MIT
