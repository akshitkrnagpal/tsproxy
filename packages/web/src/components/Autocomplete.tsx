import { useState, useRef, useEffect, useCallback } from "react";
import { getOverride } from "../overrides/getOverride";
import type { Overrides } from "../overrides/types";

type AutocompleteElements = {
  Root: "div";
  Input: "input";
  List: "ul";
  Item: "li";
  Highlight: "span";
};

interface Suggestion {
  objectID: string;
  query: string;
  highlight: string;
}

interface AutocompleteProps {
  serverUrl: string;
  collection?: string;
  limit?: number;
  placeholder?: string;
  debounce?: number;
  onSelect?: (suggestion: Suggestion) => void;
  overrides?: Overrides<AutocompleteElements>;
}

export function Autocomplete({
  serverUrl,
  collection = "products",
  limit = 5,
  placeholder = "Search...",
  debounce = 200,
  onSelect,
  overrides,
}: AutocompleteProps) {
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const inputRef = useRef<HTMLInputElement>(null);

  const root = getOverride("div", overrides?.Root);
  const input = getOverride("input", overrides?.Input);
  const list = getOverride("ul", overrides?.List);
  const item = getOverride("li", overrides?.Item);
  const highlight = getOverride("span", overrides?.Highlight);

  const fetchSuggestions = useCallback(
    async (q: string) => {
      if (!q.trim()) {
        setSuggestions([]);
        setOpen(false);
        return;
      }
      try {
        const res = await fetch(
          `${serverUrl}/api/suggestions?q=${encodeURIComponent(q)}&collection=${collection}&limit=${limit}`,
        );
        const data = await res.json();
        setSuggestions(data.suggestions || []);
        setOpen((data.suggestions || []).length > 0);
        setActiveIndex(-1);
      } catch {
        setSuggestions([]);
      }
    },
    [serverUrl, collection, limit],
  );

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setQuery(value);
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => fetchSuggestions(value), debounce);
  };

  const handleSelect = (suggestion: Suggestion) => {
    setQuery(suggestion.query);
    setOpen(false);
    onSelect?.(suggestion);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!open) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, suggestions.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter" && activeIndex >= 0) {
      e.preventDefault();
      const s = suggestions[activeIndex];
      if (s) handleSelect(s);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  };

  useEffect(() => {
    const handleClickOutside = () => setOpen(false);
    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, []);

  return (
    <root.Component
      {...root.resolveProps({
        style: { position: "relative" } as React.CSSProperties,
        onClick: (e: React.MouseEvent) => e.stopPropagation(),
      } as Record<string, unknown>)}
    >
      <input.Component
        {...input.resolveProps({
          ref: inputRef,
          type: "search",
          value: query,
          onChange: handleChange,
          onKeyDown: handleKeyDown,
          onFocus: () => suggestions.length > 0 && setOpen(true),
          placeholder,
          autoComplete: "off",
          role: "combobox",
          "aria-expanded": open,
          "aria-autocomplete": "list",
        } as Record<string, unknown>)}
      />
      {open && suggestions.length > 0 && (
        <list.Component
          {...list.resolveProps({
            role: "listbox",
            style: {
              position: "absolute",
              top: "100%",
              left: 0,
              right: 0,
              zIndex: 50,
            } as React.CSSProperties,
          } as Record<string, unknown>)}
        >
          {suggestions.map((s, i) => (
            <item.Component
              key={s.objectID}
              {...item.resolveProps({
                role: "option",
                "aria-selected": i === activeIndex,
                "data-active": i === activeIndex || undefined,
                onClick: () => handleSelect(s),
                onMouseEnter: () => setActiveIndex(i),
              } as Record<string, unknown>)}
            >
              <highlight.Component
                {...highlight.resolveProps({
                  dangerouslySetInnerHTML: { __html: s.highlight },
                })}
              />
            </item.Component>
          ))}
        </list.Component>
      )}
    </root.Component>
  );
}

export type { AutocompleteProps, AutocompleteElements, Suggestion };
