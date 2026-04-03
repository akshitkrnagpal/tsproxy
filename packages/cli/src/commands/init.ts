import * as p from "@clack/prompts";
import pc from "picocolors";
import { writeFileSync, existsSync } from "node:fs";
import { execSync } from "node:child_process";
import { resolve } from "node:path";

export async function init() {
  p.intro(pc.bgCyan(pc.black(" tsproxy init ")));

  // 1. What to set up
  const scope = await p.select({
    message: "What do you want to set up?",
    options: [
      { value: "both", label: "Backend + Frontend", hint: "proxy server and search UI" },
      { value: "backend", label: "Backend only", hint: "proxy server" },
      { value: "frontend", label: "Frontend only", hint: "search client and components" },
    ],
  });

  if (p.isCancel(scope)) return process.exit(0);

  const needsBackend = scope === "both" || scope === "backend";
  const needsFrontend = scope === "both" || scope === "frontend";

  // --- Backend setup ---
  let typesenseMode: string | symbol = "docker";
  let tsHost = "localhost";
  let tsPort = "8108";
  let tsApiKey = "test-api-key";
  let tsProtocol = "http";
  let wantsRedis = false;
  let redisHost = "localhost";
  let redisPort = "6379";

  if (needsBackend) {
    typesenseMode = await p.select({
      message: "How will you run Typesense?",
      options: [
        { value: "docker", label: "Docker (local)", hint: "generates docker-compose.yml" },
        { value: "cloud", label: "Typesense Cloud" },
        { value: "self-hosted", label: "Self-hosted" },
      ],
    });

    if (p.isCancel(typesenseMode)) return process.exit(0);

    if (typesenseMode === "cloud" || typesenseMode === "self-hosted") {
      const hostInput = await p.text({
        message: "Typesense host",
        placeholder: typesenseMode === "cloud" ? "xyz.a1.typesense.net" : "localhost",
        validate: (v) => (v.length === 0 ? "Host is required" : undefined),
      });
      if (p.isCancel(hostInput)) return process.exit(0);
      tsHost = hostInput as string;

      const portInput = await p.text({
        message: "Typesense port",
        initialValue: typesenseMode === "cloud" ? "443" : "8108",
      });
      if (p.isCancel(portInput)) return process.exit(0);
      tsPort = portInput as string;

      if (typesenseMode === "cloud") {
        tsProtocol = "https";
      }

      const keyInput = await p.text({
        message: "Typesense API key",
        validate: (v) => (v.length === 0 ? "API key is required" : undefined),
      });
      if (p.isCancel(keyInput)) return process.exit(0);
      tsApiKey = keyInput as string;
    }

    const redisChoice = await p.confirm({
      message: "Use Redis for persistent queue?",
      initialValue: typesenseMode === "docker",
    });
    if (p.isCancel(redisChoice)) return process.exit(0);
    wantsRedis = redisChoice as boolean;

    if (wantsRedis && typesenseMode !== "docker") {
      const rHost = await p.text({
        message: "Redis host",
        initialValue: "localhost",
      });
      if (p.isCancel(rHost)) return process.exit(0);
      redisHost = rHost as string;

      const rPort = await p.text({
        message: "Redis port",
        initialValue: "6379",
      });
      if (p.isCancel(rPort)) return process.exit(0);
      redisPort = rPort as string;
    }
  }

  // --- Frontend setup ---
  let frontendType: string | symbol = "react";

  if (needsFrontend) {
    frontendType = await p.select({
      message: "Frontend framework?",
      options: [
        { value: "react", label: "React", hint: "headless components + InstantSearch" },
        { value: "vanilla", label: "Vanilla JS", hint: "search client only" },
      ],
    });
    if (p.isCancel(frontendType)) return process.exit(0);
  }

  // --- Generate files ---
  const s = p.spinner();
  s.start("Generating files");

  const cwd = process.cwd();

  // tsproxy.config.ts
  if (needsBackend) {
    const configContent = generateConfig({
      tsHost,
      tsPort,
      tsProtocol,
      tsApiKey,
      wantsRedis,
      redisHost,
      redisPort,
      isDocker: typesenseMode === "docker",
    });
    writeFileSync(resolve(cwd, "tsproxy.config.ts"), configContent);
  }

  // docker-compose.yml
  if (typesenseMode === "docker") {
    const dockerContent = generateDockerCompose(wantsRedis);
    if (!existsSync(resolve(cwd, "docker-compose.yml"))) {
      writeFileSync(resolve(cwd, "docker-compose.yml"), dockerContent);
    } else {
      p.log.warn("docker-compose.yml already exists, skipping");
    }
  }

  // .env
  const envContent = generateEnv({
    tsHost,
    tsPort,
    tsProtocol,
    tsApiKey,
    isDocker: typesenseMode === "docker",
    wantsRedis,
    redisHost,
    redisPort,
  });
  if (!existsSync(resolve(cwd, ".env"))) {
    writeFileSync(resolve(cwd, ".env"), envContent);
  }

  s.stop("Files generated");

  // --- Install dependencies ---
  const deps: string[] = [];
  if (needsBackend) deps.push("@tsproxy/api");
  if (needsFrontend) {
    deps.push("@tsproxy/js");
    if (frontendType === "react") {
      deps.push("@tsproxy/react", "react-instantsearch");
    }
  }

  if (deps.length > 0) {
    const pm = detectPackageManager();
    s.start(`Installing ${deps.join(", ")}`);
    try {
      const installCmd =
        pm === "pnpm"
          ? `pnpm add ${deps.join(" ")}`
          : pm === "yarn"
            ? `yarn add ${deps.join(" ")}`
            : pm === "bun"
              ? `bun add ${deps.join(" ")}`
              : `npm install ${deps.join(" ")}`;
      execSync(installCmd, { stdio: "pipe", cwd });
      s.stop("Dependencies installed");
    } catch {
      s.stop("Failed to install — run manually:");
      p.log.info(`  ${pm} add ${deps.join(" ")}`);
    }
  }

  // --- Next steps ---
  p.note(
    [
      typesenseMode === "docker" && "docker compose up -d",
      needsBackend && "npx tsproxy dev",
      needsFrontend && "# Import in your app:",
      needsFrontend && frontendType === "react"
        ? '  import { SearchBox, Hits } from "@tsproxy/react"'
        : needsFrontend
          ? '  import { createSearchClient } from "@tsproxy/js"'
          : null,
    ]
      .filter(Boolean)
      .join("\n"),
    "Next steps",
  );

  p.outro(pc.green("Ready!"));
}

// --- File generators ---

interface ConfigOptions {
  tsHost: string;
  tsPort: string;
  tsProtocol: string;
  tsApiKey: string;
  wantsRedis: boolean;
  redisHost: string;
  redisPort: string;
  isDocker: boolean;
}

function generateConfig(opts: ConfigOptions): string {
  const redis = opts.wantsRedis
    ? `\n    redis: { host: "${opts.isDocker ? "localhost" : opts.redisHost}", port: ${opts.isDocker ? 6379 : opts.redisPort} },`
    : "";

  return `import { defineConfig } from "@tsproxy/api";

export default defineConfig({
  typesense: {
    host: "${opts.isDocker ? "localhost" : opts.tsHost}",
    port: ${opts.isDocker ? 8108 : opts.tsPort},
    protocol: "${opts.tsProtocol}",
    apiKey: process.env.TYPESENSE_API_KEY || "${opts.tsApiKey}",
  },

  server: {
    port: 3000,
    apiKey: process.env.PROXY_API_KEY || "change-me",
  },

  cache: {
    ttl: 60,
    maxSize: 1000,
  },

  queue: {
    concurrency: 5,
    maxSize: 10000,${redis}
  },

  rateLimit: {
    search: 100,
    ingest: 30,
  },

  collections: {
    // Define your collections here:
    // products: {
    //   fields: {
    //     name: { type: "string", searchable: true },
    //     price: { type: "float", sortable: true },
    //     category: { type: "string", facet: true },
    //   },
    // },
  },
});
`;
}

function generateDockerCompose(wantsRedis: boolean): string {
  let content = `services:
  typesense:
    image: typesense/typesense:30.0
    restart: unless-stopped
    ports:
      - "8108:8108"
    volumes:
      - typesense-data:/data
    command: >
      --data-dir /data
      --api-key=\${TYPESENSE_API_KEY:-test-api-key}
      --enable-cors
    healthcheck:
      test: ["CMD", "curl", "-sf", "http://localhost:8108/health"]
      interval: 10s
      timeout: 5s
      retries: 3
`;

  if (wantsRedis) {
    content += `
  redis:
    image: redis:7-alpine
    restart: unless-stopped
    ports:
      - "6379:6379"
    volumes:
      - redis-data:/data
    command: redis-server --appendonly yes
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 5s
      retries: 3
`;
  }

  content += `
volumes:
  typesense-data:`;

  if (wantsRedis) {
    content += `\n  redis-data:`;
  }

  return content + "\n";
}

function generateEnv(opts: ConfigOptions & { isDocker: boolean }): string {
  let content = `# Typesense
TYPESENSE_HOST=${opts.isDocker ? "localhost" : opts.tsHost}
TYPESENSE_PORT=${opts.isDocker ? "8108" : opts.tsPort}
TYPESENSE_PROTOCOL=${opts.tsProtocol}
TYPESENSE_API_KEY=${opts.tsApiKey}

# Proxy
PROXY_PORT=3000
PROXY_API_KEY=change-me
`;

  if (opts.wantsRedis) {
    content += `
# Redis
REDIS_HOST=${opts.isDocker ? "localhost" : opts.redisHost}
REDIS_PORT=${opts.isDocker ? "6379" : opts.redisPort}
`;
  }

  return content;
}

function detectPackageManager(): "pnpm" | "yarn" | "bun" | "npm" {
  const cwd = process.cwd();
  if (existsSync(resolve(cwd, "pnpm-lock.yaml"))) return "pnpm";
  if (existsSync(resolve(cwd, "yarn.lock"))) return "yarn";
  if (existsSync(resolve(cwd, "bun.lockb"))) return "bun";
  return "npm";
}
