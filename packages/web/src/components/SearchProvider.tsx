import { useMemo, type ReactNode } from "react";
import { InstantSearch } from "react-instantsearch";
import { createSearchClient } from "@tsproxy/js";
import { LocaleProvider, useLocale } from "../context/LocaleContext";

interface SearchProviderProps {
  serverUrl: string;
  indexName: string;
  locale?: string;
  children: ReactNode;
}

function SearchProviderInner({
  serverUrl,
  indexName,
  children,
}: Omit<SearchProviderProps, "locale">) {
  const { locale } = useLocale();

  const searchClient = useMemo(
    () =>
      createSearchClient({
        url: serverUrl,
        ...(locale ? { locale } : {}),
        cache: true,
      }),
    [serverUrl, locale],
  );

  return (
    <InstantSearch
      searchClient={searchClient as any}
      indexName={indexName}
    >
      {children}
    </InstantSearch>
  );
}

export function SearchProvider({
  serverUrl,
  indexName,
  locale,
  children,
}: SearchProviderProps) {
  return (
    <LocaleProvider initialLocale={locale}>
      <SearchProviderInner serverUrl={serverUrl} indexName={indexName}>
        {children}
      </SearchProviderInner>
    </LocaleProvider>
  );
}
