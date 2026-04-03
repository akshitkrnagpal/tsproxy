import { useMemo, useState, useRef, useCallback } from "react";
import {
  InstantSearch,
  Configure,
  useInstantSearch,
} from "react-instantsearch";
import { createSearchClient } from "@tsproxy/js";
import {
  SearchBox,
  Hits,
  RefinementList,
  Pagination,
  Stats,
  NoResults,
  HitsSkeleton,
} from "@tsproxy/react";
const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";
const INDEX_NAME = process.env.NEXT_PUBLIC_INDEX_NAME || "products";

// --- Debounce helper ---

function useDebouncedSearch(delay = 300) {
  const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  return useCallback(
    (query: string, search: (value: string) => void) => {
      clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => search(query), delay);
    },
    [delay],
  );
}


// --- Collapsible filter sidebar ---

function CollapsibleFilter({
  title,
  children,
  defaultOpen = false,
}: {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border-b border-gray-200 py-4">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between text-sm font-semibold text-gray-900"
      >
        {title}
        <svg
          className={`h-4 w-4 text-gray-500 transition-transform ${open ? "rotate-180" : ""}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </button>
      {open && <div className="mt-3">{children}</div>}
    </div>
  );
}

// --- Loading wrapper ---

function SearchResults() {
  const { status } = useInstantSearch();
  const isLoading = status === "loading" || status === "stalled";

  return (
    <div>
      {isLoading ? (
        <HitsSkeleton
          count={8}
          overrides={{
            List: {
              props: {
                className:
                  "grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 lg:grid-cols-4",
              },
            },
          }}
        />
      ) : (
        <>
          <NoResults
            overrides={{
              Root: {
                props: {
                  className:
                    "flex flex-col items-center justify-center py-16 text-center",
                },
              },
              Title: {
                props: {
                  className: "text-lg font-semibold text-gray-900",
                },
              },
              Message: {
                props: {
                  className: "mt-1 text-sm text-gray-500",
                },
              },
            }}
          />
          <Hits
            hitComponent={Hit}
            overrides={{
              List: {
                props: {
                  className:
                    "grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 lg:grid-cols-4",
                  style: { listStyle: "none", padding: 0 },
                },
              },
            }}
          />
        </>
      )}

      <div className="mt-10 flex justify-center">
        <Pagination
          overrides={{
            List: {
              props: { className: "flex items-center gap-1" },
            },
            Item: {
              props: { className: "text-sm" },
            },
            Link: {
              props: {
                className:
                  "block rounded-lg px-3 py-2 text-gray-600 hover:bg-gray-100",
              },
            },
          }}
        />
      </div>
    </div>
  );
}

// --- Product card ---

const PLACEHOLDER_COLORS = [
  "bg-amber-50",
  "bg-sky-50",
  "bg-rose-50",
  "bg-emerald-50",
  "bg-violet-50",
  "bg-orange-50",
  "bg-teal-50",
  "bg-pink-50",
  "bg-indigo-50",
  "bg-lime-50",
  "bg-cyan-50",
  "bg-fuchsia-50",
];

function Hit({ hit }: { hit: Record<string, unknown> }) {
  const colorIndex =
    Math.abs(String(hit.id || hit.objectID || "0").charCodeAt(0)) %
    PLACEHOLDER_COLORS.length;
  return (
    <div className="group">
      <div
        className={`relative aspect-square overflow-hidden rounded-lg border border-gray-200 ${PLACEHOLDER_COLORS[colorIndex]}`}
      >
        <div className="flex h-full items-center justify-center p-6">
          <span className="text-center text-lg font-medium text-gray-400">
            {String(hit.name || hit.title || "")}
          </span>
        </div>
        <button
          type="button"
          className="absolute right-3 top-3 rounded-full bg-white p-1.5 opacity-0 shadow-sm transition-opacity group-hover:opacity-100"
        >
          <svg
            className="h-5 w-5 text-gray-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z"
            />
          </svg>
        </button>
      </div>
      <div className="mt-2">
        <h3 className="text-sm font-medium text-gray-900 line-clamp-2">
          {String(hit.name || hit.title || hit.objectID)}
        </h3>
        {hit.brand ? (
          <p className="mt-0.5 text-xs text-gray-500">{String(hit.brand)}</p>
        ) : null}
        <p className="mt-1 text-base font-bold text-gray-900">
          ${String(hit.price)}
        </p>
        {hit.in_stock === false ? (
          <p className="mt-0.5 text-xs text-red-500">Out of stock</p>
        ) : null}
      </div>
    </div>
  );
}

// --- Refinement list overrides (shared) ---

const refinementOverrides = {
  List: { props: { className: "space-y-2" } },
  Item: { props: { className: "text-sm text-gray-700" } },
  Label: {
    props: {
      className:
        "flex items-center gap-2.5 cursor-pointer hover:text-gray-900",
    },
  },
  Checkbox: {
    props: {
      className:
        "h-4 w-4 rounded border-gray-300 text-gray-900 focus:ring-gray-500",
    },
  },
  Count: { props: { className: "ml-auto text-xs text-gray-400" } },
} as const;

// --- Main page ---

export default function SearchPage() {
  const searchClient = useMemo(
    () => createSearchClient({ url: API_URL }),
    [],
  );

  const debouncedSearch = useDebouncedSearch(300);

  return (
    <div className="min-h-screen bg-white">
      <InstantSearch searchClient={searchClient as any} indexName={INDEX_NAME}>
        <header className="sticky top-0 z-10 border-b border-gray-200 bg-white px-6 py-4">
          <div className="mx-auto flex max-w-7xl items-center gap-6">
            <h1 className="text-xl font-bold text-gray-900">tsproxy</h1>
            <div className="flex-1">
              <SearchBox
                placeholder="Search"
                queryHook={debouncedSearch}
                overrides={{
                  Root: { props: { className: "w-full" } },
                  Form: { props: { className: "relative" } },
                  Input: {
                    props: {
                      className:
                        "w-full rounded-full border border-gray-300 bg-gray-50 px-5 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:border-gray-400 focus:bg-white focus:outline-none",
                    },
                  },
                  SubmitButton: { props: { hidden: true } },
                  ResetButton: {
                    props: {
                      className:
                        "absolute right-4 top-1/2 -translate-y-1/2 text-xs text-gray-400 hover:text-gray-600",
                    },
                  },
                }}
              />
            </div>
          </div>
        </header>

        <Configure hitsPerPage={12} />

        <div className="mx-auto max-w-7xl px-6 py-6">
          <div className="mb-4 flex items-baseline gap-3">
            <h2 className="text-2xl font-bold text-gray-900">Products</h2>
            <Stats
              overrides={{
                Root: { props: { className: "inline" } },
                Text: { props: { className: "text-sm text-gray-500" } },
              }}
              formatText={(n) => `${n.toLocaleString()} results`}
            />
          </div>

          <div className="grid grid-cols-1 gap-8 md:grid-cols-[240px_1fr]">
            <aside>
              <CollapsibleFilter title="Category" defaultOpen>
                <RefinementList
                  attribute="category"
                  overrides={refinementOverrides}
                />
              </CollapsibleFilter>
              <CollapsibleFilter title="Brand" defaultOpen>
                <RefinementList
                  attribute="brand"
                  overrides={refinementOverrides}
                />
              </CollapsibleFilter>
            </aside>

            <SearchResults />
          </div>
        </div>
      </InstantSearch>
    </div>
  );
}
