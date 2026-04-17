"use client";

import {
  SearchProvider,
  SearchBox,
  Hits,
  RefinementList,
  Pagination,
  Stats,
  SortBy,
  NoResults,
} from "@tsproxy/react";
import { Configure } from "react-instantsearch";

const INDEX_NAME = "products";

/**
 * Relative serverUrl is fine here because `createSearchClient` runs
 * in the browser on the same origin as the Next.js host. The embedded
 * route handler at `/api/tsproxy/[[...path]]` picks up every request.
 */
const SERVER_URL = "/api/tsproxy";

function Hit({ hit }: { hit: Record<string, unknown> }) {
  const name = String(hit.name ?? "");
  const brand = hit.brand ? String(hit.brand) : null;
  const price = typeof hit.price === "number" ? hit.price : Number(hit.price);
  return (
    <div className="hit-card">
      <div className="swatch">{String(hit.color ?? "—")}</div>
      <div className="title">{name}</div>
      {brand ? <div className="brand">{brand}</div> : null}
      <div className="meta">
        <span className="price">${price.toFixed(2)}</span>
        {hit.in_stock === false ? <span className="stock">Out of stock</span> : null}
      </div>
    </div>
  );
}

export function SearchUI() {
  return (
    <SearchProvider serverUrl={SERVER_URL} indexName={INDEX_NAME}>
      <div className="app-shell">
        <div className="header">
          <div className="brand">Marketplace</div>
          <div className="badge">App Router · embedded tsproxy</div>
          <div style={{ flex: 1 }}>
            <SearchBox
              placeholder="Search products..."
              overrides={{
                Input: { props: { className: "search-input" } },
                SubmitButton: { props: { hidden: true } },
                ResetButton: { props: { hidden: true } },
              }}
            />
          </div>
        </div>

        <Configure hitsPerPage={8} />

        <div className="grid">
          <aside>
            <div className="filter-group">
              <h3>Category</h3>
              <RefinementList
                attribute="category"
                overrides={{
                  List: { props: { className: "refinement-list" } },
                  Count: { props: { className: "count" } },
                }}
              />
            </div>
            <div className="filter-group">
              <h3>Brand</h3>
              <RefinementList
                attribute="brand"
                overrides={{
                  List: { props: { className: "refinement-list" } },
                  Count: { props: { className: "count" } },
                }}
              />
            </div>
            <div className="filter-group">
              <h3>Color</h3>
              <RefinementList
                attribute="color"
                overrides={{
                  List: { props: { className: "refinement-list" } },
                  Count: { props: { className: "count" } },
                }}
              />
            </div>
          </aside>

          <main>
            <div className="hits-toolbar">
              <Stats
                overrides={{ Text: { props: { className: "stats" } } }}
                formatText={(n) => `${n.toLocaleString()} products`}
              />
              <div className="sort">
                <SortBy
                  items={[
                    { value: INDEX_NAME, label: "Relevance" },
                    { value: `${INDEX_NAME}/sort/price:asc`, label: "Price low to high" },
                    { value: `${INDEX_NAME}/sort/price:desc`, label: "Price high to low" },
                    { value: `${INDEX_NAME}/sort/rating:desc`, label: "Top rated" },
                  ]}
                />
              </div>
            </div>

            <NoResults
              overrides={{
                Root: { props: { className: "empty" } },
              }}
            />
            <Hits
              hitComponent={Hit}
              overrides={{
                List: { props: { className: "hit-grid" } },
              }}
            />
            <Pagination
              overrides={{
                List: { props: { className: "pagination" } },
              }}
            />
          </main>
        </div>
      </div>
    </SearchProvider>
  );
}
