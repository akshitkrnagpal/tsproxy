import { createAppRouterHandler } from "@tsproxy/api/nextjs";
import { proxyConfigToConfig } from "@tsproxy/api";
import proxyConfig from "@/tsproxy.config";

/**
 * Embedded tsproxy route. Every HTTP method is served by the same
 * Hono app — the adapter strips the `/api/tsproxy` prefix so Hono's
 * own routes (`/api/search`, `/api/ingest/...`, `/api/suggestions`,
 * `/api/analytics/...`, `/api/docs`) resolve cleanly.
 *
 * The shared tsproxy.config.ts is the single source of truth for
 * the schema, cache, rate limits, and ingest key.
 */
const handler = createAppRouterHandler({
  config: proxyConfigToConfig(proxyConfig),
  collections: proxyConfig.collections,
  basePath: "/api/tsproxy",
});

export const { GET, POST, PUT, PATCH, DELETE } = handler;

// tsproxy talks to Typesense + BullMQ, both Node-only, so the
// handler cannot run on the edge runtime.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
