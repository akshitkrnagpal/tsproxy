/**
 * Next.js adapter for tsproxy.
 *
 * Embeds the Hono proxy server inside Next.js API routes.
 * Supports both App Router (route.ts) and Pages Router (pages/api).
 *
 * App Router usage (app/api/[...path]/route.ts):
 *
 *   import { createAppRouterHandler } from "@tsproxy/api/nextjs";
 *   const { GET, POST, PUT, DELETE, PATCH } = createAppRouterHandler();
 *   export { GET, POST, PUT, DELETE, PATCH };
 *
 * Pages Router usage (pages/api/[...path].ts):
 *
 *   import { createPagesRouterHandler } from "@tsproxy/api/nextjs";
 *   export default createPagesRouterHandler();
 */

import { createApp } from "./index.js";
import type { Config } from "./config.js";
import type { CollectionDefinition } from "./proxy-config.js";

interface HandlerOptions {
  /** Override the auto-loaded config. */
  config?: Config;
  /** Collection definitions for schema-aware features. */
  collections?: Record<string, CollectionDefinition>;
  /**
   * Base path to strip from incoming requests before passing to Hono.
   * For example, if your catch-all is at /api/proxy/[...path], set
   * basePath to "/api/proxy" so Hono sees routes starting at "/".
   */
  basePath?: string;
}

/**
 * Creates route handlers for Next.js App Router (route.ts).
 *
 * Returns named exports for each HTTP method.
 */
export function createAppRouterHandler(options?: HandlerOptions) {
  const { app } = createApp(options?.config, options?.collections);
  const basePath = options?.basePath ?? "";

  async function handler(req: Request): Promise<Response> {
    if (basePath) {
      const url = new URL(req.url);
      const newPath = url.pathname.startsWith(basePath)
        ? url.pathname.slice(basePath.length) || "/"
        : url.pathname;
      const newUrl = new URL(newPath + url.search, url.origin);
      req = new Request(newUrl.toString(), {
        method: req.method,
        headers: req.headers,
        body: req.body,
      });
    }
    return app.fetch(req);
  }

  return {
    GET: handler,
    POST: handler,
    PUT: handler,
    DELETE: handler,
    PATCH: handler,
  };
}

/**
 * Creates a handler for Next.js Pages Router (pages/api/[...path].ts).
 *
 * Converts the Node.js IncomingMessage/ServerResponse into a fetch
 * Request/Response pair that Hono understands.
 */
export function createPagesRouterHandler(options?: HandlerOptions) {
  const { app } = createApp(options?.config, options?.collections);
  const basePath = options?.basePath ?? "";

  return async function handler(
    req: import("http").IncomingMessage,
    res: import("http").ServerResponse,
  ): Promise<void> {
    const protocol = (req.headers["x-forwarded-proto"] as string) ?? "http";
    const host = req.headers.host ?? "localhost:3000";
    let pathname = req.url ?? "/";

    if (basePath && pathname.startsWith(basePath)) {
      pathname = pathname.slice(basePath.length) || "/";
    }

    const url = `${protocol}://${host}${pathname}`;

    // Read body for non-GET/HEAD requests
    let body: BodyInit | undefined;
    if (req.method !== "GET" && req.method !== "HEAD") {
      const chunks: Buffer[] = [];
      for await (const chunk of req) {
        chunks.push(typeof chunk === "string" ? Buffer.from(chunk) : chunk);
      }
      if (chunks.length > 0) {
        body = Buffer.concat(chunks);
      }
    }

    const headers = new Headers();
    for (const [key, value] of Object.entries(req.headers)) {
      if (value) {
        if (Array.isArray(value)) {
          for (const v of value) headers.append(key, v);
        } else {
          headers.set(key, value);
        }
      }
    }

    const fetchReq = new Request(url, {
      method: req.method ?? "GET",
      headers,
      body,
    });

    const fetchRes = await app.fetch(fetchReq);

    res.statusCode = fetchRes.status;
    fetchRes.headers.forEach((value, key) => {
      res.setHeader(key, value);
    });

    const resBody = await fetchRes.arrayBuffer();
    res.end(Buffer.from(resBody));
  };
}
