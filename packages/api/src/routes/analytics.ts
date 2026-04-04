import { Hono } from "hono";
import type { Config } from "../config.js";
import { getTypesenseClient } from "../lib/typesense.js";

export function createAnalyticsRoutes(config: Config) {
  const app = new Hono();
  const typesense = getTypesenseClient(config);

  // Track a search click event
  app.post("/api/analytics/click", async (c) => {
    const body = await c.req.json<{
      query: string;
      documentId: string;
      position: number;
      collection?: string;
    }>();

    if (!body.query || !body.documentId) {
      return c.json({ error: "query and documentId are required" }, 400);
    }

    try {
      await (typesense as any).analytics.events().create({
        type: "click",
        name: "search_click",
        data: {
          q: body.query,
          doc_id: body.documentId,
          position: body.position || 1,
          collection: body.collection || "products",
        },
      });
      return c.json({ ok: true });
    } catch (err) {
      // Analytics may not be enabled — don't fail hard
      console.warn("[analytics] Click event failed:", (err as Error).message);
      return c.json({ ok: false, error: (err as Error).message });
    }
  });

  // Track a search conversion event
  app.post("/api/analytics/conversion", async (c) => {
    const body = await c.req.json<{
      query: string;
      documentId: string;
      collection?: string;
    }>();

    if (!body.query || !body.documentId) {
      return c.json({ error: "query and documentId are required" }, 400);
    }

    try {
      await (typesense as any).analytics.events().create({
        type: "conversion",
        name: "search_conversion",
        data: {
          q: body.query,
          doc_id: body.documentId,
          collection: body.collection || "products",
        },
      });
      return c.json({ ok: true });
    } catch (err) {
      console.warn("[analytics] Conversion event failed:", (err as Error).message);
      return c.json({ ok: false, error: (err as Error).message });
    }
  });

  // Get popular queries (requires Typesense analytics)
  app.get("/api/analytics/popular", async (c) => {
    const collection = c.req.query("collection") || "products";
    const limit = parseInt(c.req.query("limit") || "10", 10);

    try {
      const rules = await (typesense as any).analytics.rules().retrieve();
      return c.json({ rules, collection, limit });
    } catch (err) {
      console.warn("[analytics] Popular queries failed:", (err as Error).message);
      return c.json({ queries: [], error: (err as Error).message });
    }
  });

  return app;
}
