import { SearchUI } from "./SearchUI";

/**
 * RSC wrapper. The actual search UI is a client component because
 * react-instantsearch owns its state via React context. Keeping the
 * page an RSC gives us a fast shell render; SearchUI hydrates and
 * talks to /api/tsproxy on the same origin.
 */
export default function Page() {
  return <SearchUI />;
}
