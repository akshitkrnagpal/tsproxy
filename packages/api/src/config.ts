import { readFileSync } from "node:fs";
import { resolve } from "node:path";

export interface LocaleMap {
  [locale: string]: string;
}

export interface CollectionConfig {
  locales?: LocaleMap;
}

export interface CollectionsConfig {
  collections: Record<string, CollectionConfig>;
}

export interface Config {
  typesense: {
    host: string;
    port: number;
    protocol: string;
    apiKey: string;
  };
  proxy: {
    port: number;
    apiKey: string;
  };
  cache: {
    ttl: number;
    maxSize: number;
  };
  queue: {
    concurrency: number;
    maxSize: number;
    redis?: { host: string; port: number };
  };
  rateLimit: {
    search: number;
    ingest: number;
  };
  collections: CollectionsConfig;
}

function loadCollectionsConfig(): CollectionsConfig {
  const envConfig = process.env["COLLECTIONS_CONFIG"];
  if (envConfig) {
    try {
      return JSON.parse(envConfig) as CollectionsConfig;
    } catch {
      console.warn("Failed to parse COLLECTIONS_CONFIG env var, using empty config");
    }
  }

  try {
    const filePath = resolve(process.cwd(), "collections.json");
    const content = readFileSync(filePath, "utf-8");
    return JSON.parse(content) as CollectionsConfig;
  } catch {
    // No collections config found, that's fine
  }

  return { collections: {} };
}

function requiredEnv(name: string, fallback?: string): string {
  const value = process.env[name] ?? fallback;
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function optionalEnv(name: string, fallback: string): string {
  return process.env[name] ?? fallback;
}

function numEnv(name: string, fallback: number): number {
  const value = process.env[name];
  if (!value) return fallback;
  const parsed = parseInt(value, 10);
  return isNaN(parsed) ? fallback : parsed;
}

export function loadConfig(): Config {
  return {
    typesense: {
      host: optionalEnv("TYPESENSE_HOST", "localhost"),
      port: numEnv("TYPESENSE_PORT", 8108),
      protocol: optionalEnv("TYPESENSE_PROTOCOL", "http"),
      apiKey: requiredEnv("TYPESENSE_API_KEY"),
    },
    proxy: {
      port: numEnv("PROXY_PORT", 3000),
      apiKey: requiredEnv("PROXY_API_KEY", ""),
    },
    cache: {
      ttl: numEnv("CACHE_TTL", 60),
      maxSize: numEnv("CACHE_MAX_SIZE", 1000),
    },
    queue: {
      concurrency: numEnv("QUEUE_CONCURRENCY", 5),
      maxSize: numEnv("QUEUE_MAX_SIZE", 10000),
      ...(process.env["REDIS_HOST"] ? {
        redis: {
          host: optionalEnv("REDIS_HOST", "localhost"),
          port: numEnv("REDIS_PORT", 6379),
        },
      } : {}),
    },
    rateLimit: {
      search: numEnv("RATE_LIMIT_SEARCH", 100),
      ingest: numEnv("RATE_LIMIT_INGEST", 30),
    },
    collections: loadCollectionsConfig(),
  };
}

export function resolveCollection(
  config: CollectionsConfig,
  collection: string,
  locale?: string
): string {
  const collectionConfig = config.collections[collection];
  if (!collectionConfig?.locales || !locale) {
    return collection;
  }
  return collectionConfig.locales[locale] ?? collection;
}
