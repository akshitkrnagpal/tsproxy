import type { NextConfig } from "next";

/**
 * `@tsproxy/api/nextjs` imports BullMQ which pulls in Node built-ins
 * that the browser bundle can't see. Telling Next to treat the
 * package as a server-external keeps it out of the edge / client
 * chunks and lets the route handler require it at runtime.
 */
const nextConfig: NextConfig = {
  reactStrictMode: true,
  serverExternalPackages: ["@tsproxy/api", "bullmq"],
};

export default nextConfig;
