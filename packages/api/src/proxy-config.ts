import type { Config, CollectionsConfig } from "./config.js";

/**
 * Field type definition for a collection field
 */
export interface FieldConfig {
  type: "string" | "string[]" | "int32" | "int32[]" | "int64" | "int64[]" | "float" | "float[]" | "bool" | "bool[]" | "geopoint" | "geopoint[]" | "object" | "object[]" | "auto";
  /** Make this field searchable (included in query_by) */
  searchable?: boolean;
  /** Enable faceting on this field */
  facet?: boolean;
  /** Enable sorting on this field */
  sortable?: boolean;
  /** Allow null/missing values */
  optional?: boolean;
  /** Language locale for stemming */
  locale?: string;
  /** Enable infix search */
  infix?: boolean;
  /**
   * Compute this field's value from the document during ingestion.
   * The function receives the full document and the locale (if available)
   * and returns the field value.
   * Computed fields are automatically added before sending to Typesense.
   *
   * Example:
   * ```ts
   * category_page_slug: {
   *   type: "string",
   *   facet: true,
   *   compute: (doc, locale) => {
   *     const color = String(doc.color || "").toLowerCase();
   *     const category = String(doc.category || "").toLowerCase();
   *     return `${color}-${category}`.replace(/\s+/g, '-');
   *   },
   * }
   * ```
   */
  compute?: (doc: Record<string, unknown>, locale?: string) => unknown;
}

/**
 * Collection definition in the proxy config
 */
export interface CollectionDefinition {
  /** Field definitions */
  fields: Record<string, FieldConfig>;
  /** Supported locales — creates separate collections per locale */
  locales?: string[];
  /** Default sorting field */
  defaultSortBy?: string;
  /** Token separators */
  tokenSeparators?: string[];
  /** Symbols to index */
  symbolsToIndex?: string[];
  /** Enable nested fields */
  enableNestedFields?: boolean;
}

/**
 * Proxy configuration file schema (tsproxy.config.ts)
 */
export interface ProxyConfig {
  /** Typesense connection settings */
  typesense?: {
    host?: string;
    port?: number;
    protocol?: "http" | "https";
    apiKey?: string;
  };

  /** Proxy server settings */
  server?: {
    port?: number;
    /** API key required for ingest endpoints */
    apiKey?: string;
  };

  /** Search cache settings */
  cache?: {
    /** TTL in seconds (default: 60) */
    ttl?: number;
    /** Max cached entries (default: 1000) */
    maxSize?: number;
  };

  /** Ingestion queue settings */
  queue?: {
    /** Max concurrent Typesense writes (default: 5) */
    concurrency?: number;
    /** Max queued tasks before rejecting (default: 10000) */
    maxSize?: number;
    /** Redis connection for persistent queue (falls back to in-memory) */
    redis?: { host?: string; port?: number };
  };

  /** Rate limiting (requests per minute) */
  rateLimit?: {
    /** Search endpoint rate limit (default: 100) */
    search?: number;
    /** Ingest endpoint rate limit (default: 30) */
    ingest?: number;
  };

  /** Collection definitions */
  collections?: Record<string, CollectionDefinition>;
}

/**
 * Helper to define a typed proxy config
 */
export function defineConfig(config: ProxyConfig): ProxyConfig {
  return config;
}

/**
 * Convert ProxyConfig to the internal Config format
 */
export function proxyConfigToConfig(proxyConfig: ProxyConfig): Config {
  // Build collections config with locale mapping
  const collectionsConfig: CollectionsConfig = { collections: {} };

  if (proxyConfig.collections) {
    for (const [name, def] of Object.entries(proxyConfig.collections)) {
      if (def.locales && def.locales.length > 0) {
        const localeMap: Record<string, string> = {};
        for (const locale of def.locales) {
          localeMap[locale] = `${name}_${locale}`;
        }
        collectionsConfig.collections[name] = { locales: localeMap };
      } else {
        collectionsConfig.collections[name] = {};
      }
    }
  }

  return {
    typesense: {
      host: proxyConfig.typesense?.host || process.env["TYPESENSE_HOST"] || "localhost",
      port: proxyConfig.typesense?.port || parseInt(process.env["TYPESENSE_PORT"] || "8108", 10),
      protocol: proxyConfig.typesense?.protocol || process.env["TYPESENSE_PROTOCOL"] || "http",
      apiKey: proxyConfig.typesense?.apiKey || process.env["TYPESENSE_API_KEY"] || "",
    },
    proxy: {
      port: proxyConfig.server?.port || parseInt(process.env["PROXY_PORT"] || "3000", 10),
      apiKey: proxyConfig.server?.apiKey || process.env["PROXY_API_KEY"] || "",
    },
    cache: {
      ttl: proxyConfig.cache?.ttl ?? parseInt(process.env["CACHE_TTL"] || "60", 10),
      maxSize: proxyConfig.cache?.maxSize ?? parseInt(process.env["CACHE_MAX_SIZE"] || "1000", 10),
    },
    queue: {
      concurrency: proxyConfig.queue?.concurrency ?? parseInt(process.env["QUEUE_CONCURRENCY"] || "5", 10),
      maxSize: proxyConfig.queue?.maxSize ?? parseInt(process.env["QUEUE_MAX_SIZE"] || "10000", 10),
      ...(proxyConfig.queue?.redis || process.env["REDIS_HOST"] ? {
        redis: {
          host: proxyConfig.queue?.redis?.host || process.env["REDIS_HOST"] || "localhost",
          port: proxyConfig.queue?.redis?.port || parseInt(process.env["REDIS_PORT"] || "6379", 10),
        },
      } : {}),
    },
    rateLimit: {
      search: proxyConfig.rateLimit?.search ?? parseInt(process.env["RATE_LIMIT_SEARCH"] || "100", 10),
      ingest: proxyConfig.rateLimit?.ingest ?? parseInt(process.env["RATE_LIMIT_INGEST"] || "30", 10),
    },
    collections: collectionsConfig,
  };
}

/**
 * Get searchable fields from a collection definition
 */
export function getSearchableFields(def: CollectionDefinition): string[] {
  return Object.entries(def.fields)
    .filter(([_, field]) => field.searchable)
    .map(([name]) => name);
}

/**
 * Get facet fields from a collection definition
 */
export function getFacetFields(def: CollectionDefinition): string[] {
  return Object.entries(def.fields)
    .filter(([_, field]) => field.facet)
    .map(([name]) => name);
}

/**
 * Get sortable fields from a collection definition
 */
export function getSortableFields(def: CollectionDefinition): string[] {
  return Object.entries(def.fields)
    .filter(([_, field]) => field.sortable)
    .map(([name]) => name);
}

/**
 * Convert a collection definition to a Typesense collection schema
 * (compatible with tsctl's defineConfig format)
 */
export function toTypesenseSchema(name: string, def: CollectionDefinition) {
  return {
    name,
    fields: Object.entries(def.fields).map(([fieldName, field]) => {
      const f: Record<string, unknown> = {
        name: fieldName,
        type: field.type,
      };
      if (field.facet) f.facet = true;
      if (field.optional) f.optional = true;
      if (field.sortable && !["int32", "int64", "float", "bool"].includes(field.type)) {
        f.sort = true;
      }
      if (field.infix) f.infix = true;
      if (field.locale) f.locale = field.locale;
      return f;
    }),
    ...(def.defaultSortBy ? { default_sorting_field: def.defaultSortBy } : {}),
    ...(def.tokenSeparators ? { token_separators: def.tokenSeparators } : {}),
    ...(def.symbolsToIndex ? { symbols_to_index: def.symbolsToIndex } : {}),
    ...(def.enableNestedFields ? { enable_nested_fields: true } : {}),
  };
}

/**
 * Get computed fields from a collection definition
 */
export function getComputedFields(def: CollectionDefinition): Array<{ name: string; compute: (doc: Record<string, unknown>, locale?: string) => unknown }> {
  return Object.entries(def.fields)
    .filter(([_, field]) => field.compute !== undefined)
    .map(([name, field]) => ({ name, compute: field.compute! }));
}

/**
 * Apply computed fields to a document.
 * Runs all compute functions defined in the collection config
 * and adds the resulting values to the document.
 * The locale is passed to compute functions for localized field generation.
 */
export function applyComputedFields(
  doc: Record<string, unknown>,
  collectionDef: CollectionDefinition,
  locale?: string
): Record<string, unknown> {
  const computedFields = getComputedFields(collectionDef);
  if (computedFields.length === 0) return doc;

  const result = { ...doc };
  for (const { name, compute } of computedFields) {
    try {
      result[name] = compute(result, locale);
    } catch (error) {
      // Skip field if compute fails — don't break the whole ingest
      console.warn(`Computed field '${name}' failed:`, error);
    }
  }
  return result;
}

/**
 * Apply computed fields to an array of documents.
 */
export function applyComputedFieldsBatch(
  docs: Record<string, unknown>[],
  collectionDef: CollectionDefinition,
  locale?: string
): Record<string, unknown>[] {
  const computedFields = getComputedFields(collectionDef);
  if (computedFields.length === 0) return docs;

  return docs.map((doc) => applyComputedFields(doc, collectionDef, locale));
}
