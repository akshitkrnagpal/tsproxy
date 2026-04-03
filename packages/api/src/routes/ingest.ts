import { Hono } from "hono";
import type { Config } from "../config.js";
import { resolveCollection } from "../config.js";
import { IngestionQueue } from "../lib/queue.js";
import { getTypesenseClient } from "../lib/typesense.js";
import { authMiddleware } from "../middleware/auth.js";
import { applyComputedFields, applyComputedFieldsBatch, type CollectionDefinition } from "../proxy-config.js";

export function createIngestRoutes(config: Config, collectionDefs?: Record<string, CollectionDefinition>) {
  const app = new Hono();
  const queue = new IngestionQueue({
    concurrency: config.queue.concurrency,
    maxSize: config.queue.maxSize,
    redis: config.queue.redis,
  });
  const typesense = getTypesenseClient(config);

  // Rate limiting state
  const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
  const rateLimit = config.rateLimit.ingest;

  function checkRateLimit(ip: string): boolean {
    const now = Date.now();
    const entry = rateLimitMap.get(ip);

    if (!entry || now > entry.resetAt) {
      rateLimitMap.set(ip, { count: 1, resetAt: now + 60_000 });
      return true;
    }

    if (entry.count >= rateLimit) {
      return false;
    }

    entry.count++;
    return true;
  }

  // All ingest routes require auth
  app.use("/api/ingest/*", authMiddleware(config.proxy.apiKey));

  // Rate limit middleware for ingest routes (except queue status)
  app.use("/api/ingest/:collection/documents/*", async (c, next) => {
    const ip = c.req.header("x-forwarded-for") ?? c.req.header("x-real-ip") ?? "unknown";
    if (!checkRateLimit(ip)) {
      return c.json({ error: "Rate limit exceeded" }, 429);
    }
    await next();
  });

  app.use("/api/ingest/:collection/documents", async (c, next) => {
    if (c.req.method === "POST" || c.req.method === "DELETE") {
      const ip = c.req.header("x-forwarded-for") ?? c.req.header("x-real-ip") ?? "unknown";
      if (!checkRateLimit(ip)) {
        return c.json({ error: "Rate limit exceeded" }, 429);
      }
    }
    await next();
  });

  function getLocale(c: { req: { header: (name: string) => string | undefined; query: (name: string) => string | undefined } }): string | undefined {
    return c.req.header("X-Locale") ?? c.req.query("locale") ?? undefined;
  }

  function getCollectionDef(collectionName: string): CollectionDefinition | undefined {
    return collectionDefs?.[collectionName];
  }

  function processDoc(doc: Record<string, unknown>, collectionName: string, locale?: string): Record<string, unknown> {
    const def = getCollectionDef(collectionName);
    if (!def) return doc;
    return applyComputedFields(doc, def, locale);
  }

  function processDocs(docs: Record<string, unknown>[], collectionName: string, locale?: string): Record<string, unknown>[] {
    const def = getCollectionDef(collectionName);
    if (!def) return docs;
    return applyComputedFieldsBatch(docs, def, locale);
  }

  // Upsert single document
  app.post("/api/ingest/:collection/documents", async (c) => {
    const collectionName = c.req.param("collection");
    if (!collectionName) {
      return c.json({ error: "Collection name is required" }, 400);
    }
    const locale = getLocale(c);
    const resolved = resolveCollection(config.collections, collectionName, locale);
    const body = await c.req.json();
    const processed = processDoc(body as Record<string, unknown>, collectionName, locale);

    const result = await queue.enqueue(async () => {
      return typesense
        .collections(resolved)
        .documents()
        .upsert(processed);
    });

    return c.json(result, 201);
  });

  // Bulk import
  app.post("/api/ingest/:collection/documents/import", async (c) => {
    const collectionName = c.req.param("collection");
    if (!collectionName) {
      return c.json({ error: "Collection name is required" }, 400);
    }
    const locale = getLocale(c);
    const resolved = resolveCollection(config.collections, collectionName, locale);
    const documents = await c.req.json<Record<string, unknown>[]>();

    if (!Array.isArray(documents)) {
      return c.json({ error: "Request body must be a JSON array" }, 400);
    }

    const processed = processDocs(documents, collectionName, locale);

    const result = await queue.enqueue(async () => {
      return typesense
        .collections(resolved)
        .documents()
        .import(processed, { action: "upsert" });
    });

    return c.json(result);
  });

  // Partial update
  app.patch("/api/ingest/:collection/documents/:id", async (c) => {
    const collectionName = c.req.param("collection");
    const docId = c.req.param("id");
    if (!collectionName || !docId) {
      return c.json({ error: "Collection name and document ID are required" }, 400);
    }
    const locale = getLocale(c);
    const resolved = resolveCollection(config.collections, collectionName, locale);
    const body = await c.req.json();
    const processed = processDoc(body as Record<string, unknown>, collectionName, locale);

    const result = await queue.enqueue(async () => {
      return typesense
        .collections(resolved)
        .documents(docId)
        .update(processed);
    });

    return c.json(result);
  });

  // Delete single document
  app.delete("/api/ingest/:collection/documents/:id", async (c) => {
    const collectionName = c.req.param("collection");
    const docId = c.req.param("id");
    if (!collectionName || !docId) {
      return c.json({ error: "Collection name and document ID are required" }, 400);
    }
    const locale = getLocale(c);
    const resolved = resolveCollection(config.collections, collectionName, locale);

    const result = await queue.enqueue(async () => {
      return typesense.collections(resolved).documents(docId).delete();
    });

    return c.json(result);
  });

  // Delete by filter
  app.delete("/api/ingest/:collection/documents", async (c) => {
    const collectionName = c.req.param("collection");
    if (!collectionName) {
      return c.json({ error: "Collection name is required" }, 400);
    }
    const filterBy = c.req.query("filter_by");
    if (!filterBy) {
      return c.json({ error: "filter_by query parameter is required" }, 400);
    }
    const locale = getLocale(c);
    const resolved = resolveCollection(config.collections, collectionName, locale);

    const result = await queue.enqueue(async () => {
      return typesense
        .collections(resolved)
        .documents()
        .delete({ filter_by: filterBy });
    });

    return c.json(result);
  });

  // Queue status
  app.get("/api/ingest/queue/status", async (c) => {
    return c.json(await queue.stats());
  });

  return { app, queue };
}
