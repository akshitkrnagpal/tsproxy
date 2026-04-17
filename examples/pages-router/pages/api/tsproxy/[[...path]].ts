import { createPagesRouterHandler } from "@tsproxy/api/nextjs";
import { proxyConfigToConfig } from "@tsproxy/api";
import proxyConfig from "@/tsproxy.config";

/**
 * Embedded tsproxy Pages Router handler. The adapter strips the
 * `/api/tsproxy` prefix so the Hono app's native routes
 * (`/api/search`, `/api/ingest/...`) line up.
 *
 * Next.js parses the body for us before calling our handler, which
 * would consume the stream before tsproxy can read it — disable that
 * and let tsproxy handle its own parsing.
 */
export const config = {
  api: {
    bodyParser: false,
    responseLimit: false,
  },
};

export default createPagesRouterHandler({
  config: proxyConfigToConfig(proxyConfig),
  collections: proxyConfig.collections,
  basePath: "/api/tsproxy",
});
