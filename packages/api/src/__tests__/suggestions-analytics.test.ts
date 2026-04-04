import { describe, it, expect, beforeAll } from "vitest";
import { createApp, type Config } from "../index.js";

const config: Config = {
  typesense: {
    host: "localhost",
    port: 8108,
    protocol: "http",
    apiKey: "test-api-key",
  },
  proxy: {
    port: 3000,
    apiKey: "test-ingest-key",
  },
  cache: { ttl: 60, maxSize: 1000 },
  queue: { concurrency: 5, maxSize: 10000 },
  rateLimit: { search: 100, ingest: 30 },
  collections: { collections: {} },
};

const collectionDefs = {
  products: {
    fields: {
      name: { type: "string" as const, searchable: true },
      price: { type: "float" as const, sortable: true },
    },
  },
};

describe("Suggestions endpoint", () => {
  let app: ReturnType<typeof createApp>["app"];

  beforeAll(() => {
    const result = createApp(config, collectionDefs);
    app = result.app;
  });

  it("GET /api/suggestions returns empty for no query", async () => {
    const res = await app.request("/api/suggestions");
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.suggestions).toEqual([]);
  });

  it("GET /api/suggestions?q=test returns suggestions array", async () => {
    const res = await app.request("/api/suggestions?q=wireless&collection=products");
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data).toHaveProperty("suggestions");
    expect(data).toHaveProperty("query", "wireless");
    expect(Array.isArray(data.suggestions)).toBe(true);
  });
});

describe("Analytics endpoints", () => {
  let app: ReturnType<typeof createApp>["app"];

  beforeAll(() => {
    const result = createApp(config, collectionDefs);
    app = result.app;
  });

  it("POST /api/analytics/click requires query and documentId", async () => {
    const res = await app.request("/api/analytics/click", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toContain("required");
  });

  it("POST /api/analytics/click accepts valid event", async () => {
    const res = await app.request("/api/analytics/click", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        query: "mouse",
        documentId: "15",
        position: 1,
      }),
    });
    expect(res.status).toBe(200);
    const data = await res.json();
    // May fail if analytics not enabled, but shouldn't error
    expect(data).toHaveProperty("ok");
  });

  it("POST /api/analytics/conversion requires query and documentId", async () => {
    const res = await app.request("/api/analytics/conversion", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    expect(res.status).toBe(400);
  });

  it("POST /api/analytics/conversion accepts valid event", async () => {
    const res = await app.request("/api/analytics/conversion", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        query: "mouse",
        documentId: "15",
      }),
    });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data).toHaveProperty("ok");
  });

  it("GET /api/analytics/popular returns response", async () => {
    const res = await app.request("/api/analytics/popular");
    expect(res.status).toBe(200);
  });
});
