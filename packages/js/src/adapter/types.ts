/**
 * Algolia-compatible SearchClient interface.
 * Can be passed directly to InstantSearch's searchClient prop.
 */
export interface SearchClient {
  search(requests: readonly SearchRequest[]): Promise<SearchResponse>;
  searchForFacetValues?(requests: readonly SearchRequest[]): Promise<SearchResponse>;
  clearCache?(): void;
}

export interface SearchRequest {
  indexName: string;
  params?: Record<string, unknown>;
}

export interface Hit {
  objectID: string;
  [key: string]: unknown;
}

export interface FacetValue {
  value: string;
  count: number;
  highlighted: string;
  isRefined: boolean;
}

export interface SearchResponseResult {
  hits: Hit[];
  nbHits: number;
  page: number;
  nbPages: number;
  hitsPerPage: number;
  exhaustiveNbHits: boolean;
  query: string;
  params: string;
  index: string;
  processingTimeMS: number;
  facets?: Record<string, Record<string, number>>;
}

export interface SearchResponse {
  results: SearchResponseResult[];
}
