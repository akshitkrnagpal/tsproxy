import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { loadConfig, type Config } from "./config.js";
import { errorHandler } from "./middleware/error-handler.js";
import { createSearchRoutes } from "./routes/search.js";
import { createIngestRoutes } from "./routes/ingest.js";
import { createHealthRoutes } from "./routes/health.js";
import { createDocsRoutes } from "./routes/docs.js";
import { createSuggestionsRoutes } from "./routes/suggestions.js";
import { createAnalyticsRoutes } from "./routes/analytics.js";
import type { CollectionDefinition } from "./proxy-config.js";

export function createApp(config?: Config, collectionDefs?: Record<string, CollectionDefinition>) {
  const cfg = config ?? loadConfig();
  const app = new Hono();

  // Global middleware
  app.use("*", cors());
  app.use("*", logger());

  // Error handler
  app.onError(errorHandler);

  // Routes
  const { app: searchApp, cache: searchCache } = createSearchRoutes(cfg, collectionDefs);
  const { app: ingestApp, queue: ingestQueue } = createIngestRoutes(cfg, collectionDefs);
  const healthApp = createHealthRoutes(cfg);
  const docsApp = createDocsRoutes();
  const suggestionsApp = createSuggestionsRoutes(cfg, collectionDefs);
  const analyticsApp = createAnalyticsRoutes(cfg);

  app.route("/", searchApp);
  app.route("/", ingestApp);
  app.route("/", healthApp);
  app.route("/", docsApp);
  app.route("/", suggestionsApp);
  app.route("/", analyticsApp);

  return { app, config: cfg, searchCache, ingestQueue };
}

// Re-export values and types
export { loadConfig, resolveCollection, type Config } from "./config.js";
export {
  defineConfig,
  proxyConfigToConfig,
  getSearchableFields,
  getFacetFields,
  getSortableFields,
  toTypesenseSchema,
  getComputedFields,
  applyComputedFields,
  applyComputedFieldsBatch,
  type ProxyConfig,
  type CollectionDefinition,
  type FieldConfig,
  type SynonymDefinition,
  type CurationDefinition,
} from "./proxy-config.js";
export { LRUCache, type CacheStats } from "./lib/cache.js";
export { IngestionQueue, type QueueStats } from "./lib/queue.js";
export {
  transformAlgoliaRequestToTypesense,
  transformTypesenseResponseToAlgolia,
  transformMultiSearchResponse,
  type AlgoliaSearchRequest,
  type AlgoliaMultiSearchRequest,
  type AlgoliaMultiSearchResponse,
  type AlgoliaSearchResult,
  type AlgoliaHit,
  type AlgoliaHighlightResult,
  type TypesenseSearchParams,
  type TypesenseMultiSearchParams,
  type TypesenseSearchResponse,
  type TypesenseMultiSearchResponse,
} from "./lib/transform.js";
