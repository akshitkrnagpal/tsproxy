import { Hono } from "hono";
import type { Config } from "../config.js";
import { resolveCollection } from "../config.js";
import { getTypesenseClient } from "../lib/typesense.js";
import { getSearchableFields, type CollectionDefinition } from "../proxy-config.js";

export function createSuggestionsRoutes(
  config: Config,
  collectionDefs?: Record<string, CollectionDefinition>,
) {
  const app = new Hono();
  const typesense = getTypesenseClient(config);

  app.get("/api/suggestions", async (c) => {
    const query = c.req.query("q") || "";
    const collection = c.req.query("collection") || "products";
    const limit = parseInt(c.req.query("limit") || "5", 10);
    const locale = c.req.header("X-Locale") ?? c.req.query("locale");

    if (!query) {
      return c.json({ suggestions: [] });
    }

    const resolved = resolveCollection(config.collections, collection, locale);

    // Determine query_by from config
    let queryBy = "name";
    if (collectionDefs?.[collection]) {
      const searchable = getSearchableFields(collectionDefs[collection]!);
      if (searchable.length > 0) {
        queryBy = searchable.join(",");
      }
    }

    try {
      const result = await typesense
        .collections(resolved)
        .documents()
        .search({
          q: query,
          query_by: queryBy,
          per_page: limit,
          prefix: "true",
          highlight_full_fields: queryBy,
          highlight_start_tag: "<mark>",
          highlight_end_tag: "</mark>",
        });

      const suggestions = (result.hits || []).map((hit: any) => {
        const doc = hit.document || {};
        const highlights = hit.highlights || [];

        // Find the best highlighted field
        let highlightedValue = "";
        for (const hl of highlights) {
          if (hl.snippet) {
            highlightedValue = hl.snippet;
            break;
          }
        }

        return {
          objectID: String(doc.id || ""),
          query: String(doc[queryBy.split(",")[0]!] || ""),
          highlight: highlightedValue || String(doc[queryBy.split(",")[0]!] || ""),
        };
      });

      return c.json({
        suggestions,
        query,
        found: result.found,
      });
    } catch (err) {
      console.error("[suggestions] Error:", (err as Error).message);
      return c.json({ suggestions: [], query, error: (err as Error).message });
    }
  });

  return app;
}
