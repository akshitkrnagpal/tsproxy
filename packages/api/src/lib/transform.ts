/**
 * Transform between Algolia InstantSearch format and Typesense search format.
 */

// ---- Types ----

export interface AlgoliaSearchRequest {
  indexName: string;
  params: string | Record<string, unknown>;
}

export interface AlgoliaMultiSearchRequest {
  requests: AlgoliaSearchRequest[];
}

export interface AlgoliaHighlightResult {
  value: string;
  matchLevel: "none" | "partial" | "full";
  matchedWords: string[];
  fullyHighlighted?: boolean;
}

export interface AlgoliaHit {
  objectID: string;
  _highlightResult: Record<string, AlgoliaHighlightResult>;
  [key: string]: unknown;
}

export interface AlgoliaSearchResult {
  hits: AlgoliaHit[];
  nbHits: number;
  page: number;
  nbPages: number;
  hitsPerPage: number;
  processingTimeMS: number;
  query: string;
  params: string;
  facets: Record<string, Record<string, number>>;
  facets_stats: Record<string, unknown>;
  exhaustiveNbHits: boolean;
}

export interface AlgoliaMultiSearchResponse {
  results: AlgoliaSearchResult[];
}

export interface TypesenseSearchParams {
  q: string;
  query_by?: string;
  filter_by?: string;
  sort_by?: string;
  facet_by?: string;
  max_facet_values?: number;
  page?: number;
  per_page?: number;
  highlight_full_fields?: string;
  highlight_affix_num_tokens?: number;
  highlight_start_tag?: string;
  highlight_end_tag?: string;
  [key: string]: unknown;
}

export interface TypesenseMultiSearchParams {
  searches: Array<TypesenseSearchParams & { collection: string }>;
}

interface TypesenseHighlight {
  field: string;
  snippet?: string;
  value?: string;
  matched_tokens?: string[];
  snippets?: Array<{ value: string; matched_tokens?: string[] }>;
  indices?: number[];
}

interface TypesenseHit {
  document: Record<string, unknown>;
  highlights?: TypesenseHighlight[];
  text_match?: number;
  text_match_info?: Record<string, unknown>;
}

interface TypesenseFacetCount {
  field_name: string;
  counts: Array<{ value: string; count: number }>;
  stats?: {
    min?: number;
    max?: number;
    avg?: number;
    sum?: number;
  };
}

export interface TypesenseSearchResponse {
  found: number;
  hits?: TypesenseHit[];
  search_time_ms: number;
  facet_counts?: TypesenseFacetCount[];
  page?: number;
  out_of?: number;
  request_params?: Record<string, unknown>;
}

export interface TypesenseMultiSearchResponse {
  results: TypesenseSearchResponse[];
}

// ---- Algolia -> Typesense request transform ----

function parseAlgoliaParams(params: string | Record<string, unknown>): Record<string, string> {
  if (!params) return {};

  // InstantSearch v7+ sends params as an object; older versions send a URL-encoded string
  if (typeof params === "object") {
    const result: Record<string, string> = {};
    for (const [key, value] of Object.entries(params)) {
      if (value === undefined || value === null) continue;
      result[key] = typeof value === "string" ? value : JSON.stringify(value);
    }
    return result;
  }

  const result: Record<string, string> = {};
  const searchParams = new URLSearchParams(params);
  for (const [key, value] of searchParams.entries()) {
    result[key] = value;
  }
  return result;
}

function transformAlgoliaFilters(facetFilters?: string, numericFilters?: string, filters?: string): string | undefined {
  const parts: string[] = [];

  if (filters) {
    // Algolia SQL-like filter syntax — do a basic pass-through.
    // Full Algolia filter syntax is complex; we support simple field:value patterns.
    parts.push(filters);
  }

  if (facetFilters) {
    try {
      const parsed = JSON.parse(facetFilters) as (string | string[])[];
      const conditions: string[] = [];

      for (const filter of parsed) {
        if (Array.isArray(filter)) {
          // OR group
          const orParts = filter.map(parseOneFacetFilter).filter(Boolean);
          if (orParts.length > 0) {
            conditions.push(`(${orParts.join(" || ")})`);
          }
        } else {
          const part = parseOneFacetFilter(filter);
          if (part) conditions.push(part);
        }
      }

      if (conditions.length > 0) {
        parts.push(conditions.join(" && "));
      }
    } catch {
      // If parsing fails, skip
    }
  }

  if (numericFilters) {
    try {
      const parsed = JSON.parse(numericFilters) as string[];
      const conditions = parsed
        .map((f: string) => {
          // Algolia format: "price>10", "rating>=4"
          const match = f.match(/^(\w+)\s*(>=|<=|>|<|=|!=)\s*(.+)$/);
          if (match) {
            const [, field, op, val] = match;
            return `${field}:${op}${val}`;
          }
          return null;
        })
        .filter(Boolean);

      if (conditions.length > 0) {
        parts.push(conditions.join(" && "));
      }
    } catch {
      // If parsing fails, skip
    }
  }

  return parts.length > 0 ? parts.join(" && ") : undefined;
}

function parseOneFacetFilter(filter: string): string | null {
  // Format: "category:Electronics" or "-category:Electronics" (negation)
  const negated = filter.startsWith("-");
  const clean = negated ? filter.slice(1) : filter;
  const colonIdx = clean.indexOf(":");
  if (colonIdx === -1) return null;

  const field = clean.slice(0, colonIdx);
  const value = clean.slice(colonIdx + 1);

  if (negated) {
    return `${field}:!=${value}`;
  }
  return `${field}:=${value}`;
}

export function transformAlgoliaRequestToTypesense(
  request: AlgoliaSearchRequest,
  resolvedCollection: string
): TypesenseSearchParams & { collection: string } {
  const params = parseAlgoliaParams(request.params);

  const query = params["query"] ?? "";
  const hitsPerPage = parseInt(params["hitsPerPage"] ?? "20", 10);
  const page = parseInt(params["page"] ?? "0", 10);

  const result: TypesenseSearchParams & { collection: string } = {
    collection: resolvedCollection,
    q: query || "*",
    per_page: hitsPerPage,
    page: page + 1, // Algolia is 0-based, Typesense is 1-based
    highlight_start_tag: "<mark>",
    highlight_end_tag: "</mark>",
  };

  // Facets
  if (params["facets"]) {
    try {
      const facets = JSON.parse(params["facets"]) as string[];
      if (facets.length > 0) {
        result.facet_by = facets.join(",");
      }
    } catch {
      // If it's not JSON, treat as comma-separated
      result.facet_by = params["facets"];
    }
  }

  // Max facet values
  if (params["maxValuesPerFacet"]) {
    result.max_facet_values = parseInt(params["maxValuesPerFacet"], 10);
  }

  // Filters
  const filterBy = transformAlgoliaFilters(
    params["facetFilters"],
    params["numericFilters"],
    params["filters"]
  );
  if (filterBy) {
    result.filter_by = filterBy;
  }

  // Query by - if provided by Algolia's restrictSearchableAttributes
  if (params["restrictSearchableAttributes"]) {
    try {
      const attrs = JSON.parse(params["restrictSearchableAttributes"]) as string[];
      result.query_by = attrs.join(",");
    } catch {
      result.query_by = params["restrictSearchableAttributes"];
    }
  }

  // Sort
  if (params["sortBy"]) {
    result.sort_by = params["sortBy"];
  }

  // Geo search: aroundLatLng + aroundRadius
  if (params["aroundLatLng"]) {
    const geo = params["aroundLatLng"];
    const radius = params["aroundRadius"] || "10000"; // meters
    const geoField = params["geoField"] || "_geoloc";
    const [lat, lng] = geo.split(",").map((s: string) => s.trim());
    if (lat && lng) {
      const existing = result.filter_by ? `${result.filter_by} && ` : "";
      result.filter_by = `${existing}${geoField}:(${lat}, ${lng}, ${radius} m)`;
      if (!result.sort_by) {
        result.sort_by = `${geoField}(${lat}, ${lng}):asc`;
      }
    }
  }

  // Group by
  if (params["groupBy"]) {
    result.group_by = params["groupBy"];
    if (params["groupLimit"]) {
      result.group_limit = parseInt(params["groupLimit"], 10);
    }
  }

  return result;
}

// ---- Typesense -> Algolia response transform ----

function transformHighlights(
  highlights: TypesenseHighlight[] | undefined,
  document: Record<string, unknown>
): Record<string, AlgoliaHighlightResult> {
  const result: Record<string, AlgoliaHighlightResult> = {};

  // Initialize all document fields with "none" match level
  for (const [key, value] of Object.entries(document)) {
    if (key === "id") continue;
    result[key] = {
      value: String(value ?? ""),
      matchLevel: "none",
      matchedWords: [],
    };
  }

  // Override with actual highlights
  if (highlights) {
    for (const hl of highlights) {
      const snippetValue = hl.snippet ?? hl.value ?? "";
      const matchedTokens = hl.matched_tokens ?? [];

      // If there are snippets (array field), use the first one
      if (hl.snippets && hl.snippets.length > 0) {
        const firstSnippet = hl.snippets[0];
        if (firstSnippet) {
          result[hl.field] = {
            value: firstSnippet.value,
            matchLevel: (firstSnippet.matched_tokens?.length ?? 0) > 0 ? "full" : "none",
            matchedWords: firstSnippet.matched_tokens ?? [],
          };
          continue;
        }
      }

      result[hl.field] = {
        value: snippetValue,
        matchLevel: matchedTokens.length > 0 ? "full" : "none",
        matchedWords: matchedTokens,
      };
    }
  }

  return result;
}

function transformHit(hit: TypesenseHit): AlgoliaHit {
  const document = hit.document;
  const id = document["id"];

  return {
    ...document,
    objectID: String(id ?? ""),
    _highlightResult: transformHighlights(hit.highlights, document),
  };
}

function transformFacets(
  facetCounts: TypesenseFacetCount[] | undefined
): { facets: Record<string, Record<string, number>>; facets_stats: Record<string, unknown> } {
  const facets: Record<string, Record<string, number>> = {};
  const facetsStats: Record<string, unknown> = {};

  if (!facetCounts) {
    return { facets, facets_stats: facetsStats };
  }

  for (const facet of facetCounts) {
    const values: Record<string, number> = {};
    for (const count of facet.counts) {
      values[count.value] = count.count;
    }
    facets[facet.field_name] = values;

    if (facet.stats) {
      facetsStats[facet.field_name] = facet.stats;
    }
  }

  return { facets, facets_stats: facetsStats };
}

export function transformTypesenseResponseToAlgolia(
  tsResponse: TypesenseSearchResponse,
  originalRequest: AlgoliaSearchRequest
): AlgoliaSearchResult {
  const params = parseAlgoliaParams(originalRequest.params);
  const hitsPerPage = parseInt(params["hitsPerPage"] ?? "20", 10);
  const page = parseInt(params["page"] ?? "0", 10);
  const query = params["query"] ?? "";

  const hits = (tsResponse.hits ?? []).map(transformHit);
  const { facets, facets_stats } = transformFacets(tsResponse.facet_counts);

  const nbHits = tsResponse.found ?? 0;
  const nbPages = nbHits > 0 ? Math.ceil(nbHits / hitsPerPage) : 0;

  // Serialize params back to a string if it was an object
  const paramsString = typeof originalRequest.params === "string"
    ? originalRequest.params
    : new URLSearchParams(Object.entries(params)).toString();

  return {
    hits,
    nbHits,
    page,
    nbPages,
    hitsPerPage,
    processingTimeMS: tsResponse.search_time_ms,
    query,
    params: paramsString,
    facets,
    facets_stats,
    exhaustiveNbHits: true,
  };
}

export function transformMultiSearchResponse(
  tsResponse: TypesenseMultiSearchResponse,
  originalRequests: AlgoliaSearchRequest[]
): AlgoliaMultiSearchResponse {
  return {
    results: tsResponse.results.map((result, i) => {
      const originalRequest = originalRequests[i];
      if (!originalRequest) {
        return transformTypesenseResponseToAlgolia(result, { indexName: "", params: "" });
      }
      return transformTypesenseResponseToAlgolia(result, originalRequest);
    }),
  };
}
