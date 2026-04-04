# @tsproxy/react

Headless React components for [tsproxy](https://github.com/akshitkrnagpal/tsproxy) with a BaseUI-style overrides pattern.

> **This project is under heavy development.**

## Install

```bash
npm install @tsproxy/react @tsproxy/js react-instantsearch
```

## Usage

```tsx
import { SearchProvider, SearchBox, Hits, RefinementList, Pagination, Stats } from "@tsproxy/react";
import { Configure } from "react-instantsearch";

export default function SearchPage() {
  return (
    <SearchProvider serverUrl="http://localhost:3000" indexName="products">
      <Configure hitsPerPage={12} />
      <SearchBox placeholder="Search..." />
      <Stats />
      <RefinementList attribute="category" />
      <Hits hitComponent={({ hit }) => <div>{hit.name}</div>} />
      <Pagination />
    </SearchProvider>
  );
}
```

## Overrides

Every component accepts an `overrides` prop to customize any sub-element:

```tsx
<SearchBox
  overrides={{
    Input: { props: { className: "rounded-full border px-4 py-2" } },
    SubmitButton: { props: { hidden: true } },
    ResetButton: { component: MyResetButton },
  }}
/>
```

## Components

| Component | Sub-elements |
|-----------|-------------|
| `SearchBox` | Root, Form, Input, SubmitButton, ResetButton |
| `Hits` | Root, List, Item |
| `RefinementList` | Root, List, Item, Label, Checkbox, LabelText, Count |
| `Pagination` | Root, List, Item, Link |
| `Stats` | Root, Text |
| `SortBy` | Root, Select, Option |
| `NoResults` | Root, Title, Message |
| `HitsSkeleton` | Root, List, Item |
| `LocaleSelector` | Root, Select, Option |
| `SearchProvider` | — (wraps InstantSearch) |

## Documentation

[tsproxy.akshit.io](https://tsproxy.akshit.io)

## License

MIT
