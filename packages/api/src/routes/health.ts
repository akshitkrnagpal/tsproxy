import { Hono } from "hono";
import type { Config } from "../config.js";
import { getTypesenseClient } from "../lib/typesense.js";

export function createHealthRoutes(config: Config) {
  const app = new Hono();
  const typesense = getTypesenseClient(config);

  app.get("/api/health", async (c) => {
    let typesenseStatus: "ok" | "error" = "error";
    let typesenseMessage = "";

    try {
      const health = (await typesense.health.retrieve()) as { ok: boolean };
      typesenseStatus = health.ok ? "ok" : "error";
    } catch (err) {
      typesenseMessage = err instanceof Error ? err.message : "Unknown error";
    }

    // Check Redis if configured
    let redisStatus: "ok" | "error" | "not_configured" = "not_configured";
    let redisMessage = "";

    if (config.queue.redis) {
      const { host, port } = config.queue.redis;
      try {
        const net = await import("node:net");
        await new Promise<void>((resolve, reject) => {
          const socket = net.createConnection({ host, port }, () => {
            socket.end();
            resolve();
          });
          socket.on("error", reject);
          socket.setTimeout(2000, () => {
            socket.destroy();
            reject(new Error("Connection timeout"));
          });
        });
        redisStatus = "ok";
      } catch (err) {
        redisStatus = "error";
        redisMessage = err instanceof Error ? err.message : "Unknown error";
      }
    }

    const allOk = typesenseStatus === "ok" && redisStatus !== "error";
    const status = allOk ? 200 : 503;

    return c.json(
      {
        status: allOk ? "healthy" : "degraded",
        timestamp: new Date().toISOString(),
        proxy: { status: "ok" },
        typesense: {
          status: typesenseStatus,
          host: `${config.typesense.protocol}://${config.typesense.host}:${config.typesense.port}`,
          ...(typesenseMessage && { error: typesenseMessage }),
        },
        redis: {
          status: redisStatus,
          ...(config.queue.redis && {
            host: `${config.queue.redis.host}:${config.queue.redis.port}`,
          }),
          ...(redisMessage && { error: redisMessage }),
        },
      },
      status as 200
    );
  });

  return app;
}
