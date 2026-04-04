// Re-export adapter from @tsproxy/js for convenience
export { createSearchClient } from "@tsproxy/js";
export type {
  SearchClient,
  SearchRequest,
  SearchResponse,
  SearchResponseResult,
  Hit,
  FacetValue,
} from "@tsproxy/js";

// Overrides system
export type { Override, Overrides } from "./overrides/types";
export { getOverride } from "./overrides/getOverride";

// Context
export { LocaleContext, LocaleProvider, useLocale } from "./context/LocaleContext";

// Components
export { SearchProvider } from "./components/SearchProvider";
export { SearchBox, type SearchBoxProps, type SearchBoxElements } from "./components/SearchBox";
export { Hits, type HitsProps, type HitsElements } from "./components/Hits";
export { RefinementList, type RefinementListProps, type RefinementListElements } from "./components/RefinementList";
export { Pagination, type PaginationProps, type PaginationElements } from "./components/Pagination";
export { Stats, type StatsProps, type StatsElements } from "./components/Stats";
export { SortBy, type SortByProps, type SortByElements, type SortByItem } from "./components/SortBy";
export { LocaleSelector, type LocaleSelectorProps, type LocaleSelectorElements, type LocaleOption } from "./components/LocaleSelector";
export { NoResults, type NoResultsProps, type NoResultsElements } from "./components/NoResults";
export { HitsSkeleton, type HitsSkeletonProps, type HitsSkeletonElements } from "./components/HitsSkeleton";
export { Autocomplete, type AutocompleteProps, type AutocompleteElements, type Suggestion } from "./components/Autocomplete";
