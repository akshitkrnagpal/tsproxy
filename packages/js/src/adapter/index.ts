import type { SearchClient } from "./types";

export type { SearchClient } from "./types";
export type { SearchRequest, SearchResponse, SearchResponseResult, Hit, FacetValue } from "./types";

interface CreateSearchClientOptions {
  url: string;
  locale?: string;
  cache?: boolean;
}

/**
 * Creates an Algolia-compatible searchClient that proxies requests
 * through the typesense-proxy server.
 *
 * Includes built-in request deduplication and result caching.
 */
export function createSearchClient(options: CreateSearchClientOptions): SearchClient {
  const { url, cache: enableCache = true } = options;
  let locale = options.locale;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const resultCache = new Map<string, any>();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const pendingRequests = new Map<string, Promise<any>>();

  function getCacheKey(requests: unknown[]): string {
    return JSON.stringify({ requests, locale });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async function performSearch(requests: any[]): Promise<any> {
    const cacheKey = getCacheKey(requests);

    if (enableCache) {
      const cached = resultCache.get(cacheKey);
      if (cached) {
        return cached;
      }

      const pending = pendingRequests.get(cacheKey);
      if (pending) {
        return pending;
      }
    }

    const promise = (async () => {
      const response = await fetch(`${url}/api/search`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(locale ? { "X-Locale": locale } : {}),
        },
        body: JSON.stringify({ requests }),
      });

      if (!response.ok) {
        throw new Error(`Search request failed: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();

      if (enableCache) {
        resultCache.set(cacheKey, data);
      }

      return data;
    })();

    if (enableCache) {
      pendingRequests.set(cacheKey, promise);

      promise.finally(() => {
        pendingRequests.delete(cacheKey);
      });
    }

    return promise;
  }

  function clearCache(): void {
    resultCache.clear();
    pendingRequests.clear();
  }

  // Build the client object. We cast to SearchClient since our search()
  // signature is compatible at runtime but TypeScript's complex conditional
  // types from algoliasearch-helper make direct typing impractical.
  const client = {
    search: performSearch,
    searchForFacetValues: performSearch,
    clearCache,
  } as unknown as SearchClient & { clearCache: () => void };

  return client;
}
