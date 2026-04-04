# @tsproxy/js

InstantSearch-compatible `searchClient` adapter for [tsproxy](https://github.com/akshitkrnagpal/tsproxy).

> **This project is under heavy development.**

## Install

```bash
npm install @tsproxy/js
```

## Usage

```ts
import { createSearchClient } from "@tsproxy/js";

const searchClient = createSearchClient({
  url: "http://localhost:3000",
  locale: "en",  // optional
  cache: true,   // optional (default: true)
});
```

### With react-instantsearch

```tsx
import { InstantSearch } from "react-instantsearch";
import { createSearchClient } from "@tsproxy/js";

const searchClient = createSearchClient({ url: "http://localhost:3000" });

<InstantSearch searchClient={searchClient} indexName="products">
  {/* widgets */}
</InstantSearch>
```

### Standalone

```ts
const results = await searchClient.search([
  { indexName: "products", params: { query: "keyboard", hitsPerPage: 10 } },
]);
```

## API

### `createSearchClient(options)`

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `url` | `string` | — | Proxy server URL (required) |
| `locale` | `string` | — | Locale for multilingual search |
| `cache` | `boolean` | `true` | Enable client-side result caching |

## Documentation

[tsproxy.akshit.io](https://tsproxy.akshit.io)

## License

MIT
