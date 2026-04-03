import { useSearchBox } from "react-instantsearch";
import { getOverride } from "../overrides/getOverride";
import type { Overrides } from "../overrides/types";
import { type FormEvent, useRef, useState, useEffect } from "react";

type SearchBoxElements = {
  Root: "div";
  Form: "form";
  Input: "input";
  SubmitButton: "button";
  ResetButton: "button";
};

interface SearchBoxProps {
  placeholder?: string;
  autoFocus?: boolean;
  overrides?: Overrides<SearchBoxElements>;
  queryHook?: (query: string, search: (value: string) => void) => void;
}

export function SearchBox({
  placeholder = "Search...",
  autoFocus = false,
  overrides,
  queryHook,
}: SearchBoxProps) {
  const { query, refine, clear } = useSearchBox({ queryHook });
  const inputRef = useRef<HTMLInputElement>(null);

  // Maintain local input value so typing feels instant even with debounce.
  // Sync from the hook's query on mount and when external state changes
  // (e.g. URL routing restores a query).
  const [inputValue, setInputValue] = useState(query);
  const isTypingRef = useRef(false);

  useEffect(() => {
    // Only sync from hook → local when user is not actively typing
    if (!isTypingRef.current) {
      setInputValue(query);
    }
  }, [query]);

  const root = getOverride("div", overrides?.Root);
  const form = getOverride("form", overrides?.Form);
  const input = getOverride("input", overrides?.Input);
  const submit = getOverride("button", overrides?.SubmitButton);
  const reset = getOverride("button", overrides?.ResetButton);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
  };

  const handleReset = () => {
    setInputValue("");
    clear();
    inputRef.current?.focus();
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.currentTarget.value;
    setInputValue(value);
    isTypingRef.current = true;
    refine(value);
    // Reset typing flag after debounce window
    setTimeout(() => {
      isTypingRef.current = false;
    }, 500);
  };

  return (
    <root.Component {...root.resolveProps({})}>
      <form.Component
        {...form.resolveProps({
          onSubmit: handleSubmit,
          role: "search",
          noValidate: true,
        })}
      >
        <input.Component
          {...input.resolveProps({
            ref: inputRef,
            type: "search",
            placeholder,
            autoFocus,
            value: inputValue,
            onChange: handleChange,
            autoComplete: "off",
            autoCorrect: "off",
            spellCheck: false,
          })}
        />
        <submit.Component
          {...submit.resolveProps({ type: "submit", children: "Search" })}
        />
        <reset.Component
          {...reset.resolveProps({
            type: "reset",
            onClick: handleReset,
            hidden: !inputValue,
            children: "Reset",
          })}
        />
      </form.Component>
    </root.Component>
  );
}

export type { SearchBoxProps, SearchBoxElements };
