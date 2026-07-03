"use client";

import { useCallback, useEffect, useRef, useState } from "react";

interface PaginatedListResponse<T> {
  items: T[];
}

interface UseDebouncedApiSearchOptions {
  buildUrl: (query: string) => string;
  debounceMs?: number;
  enabled?: boolean;
}

export function useDebouncedApiSearch<T>({
  buildUrl,
  debounceMs = 250,
  enabled = true,
}: UseDebouncedApiSearchOptions) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<T[]>([]);
  const [loading, setLoading] = useState(enabled);
  const [touched, setTouched] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const runSearch = useCallback(
    async (q: string) => {
      setLoading(true);
      try {
        const res = await fetch(buildUrl(q));
        const data = (await res.json()) as PaginatedListResponse<T>;
        setResults(data.items ?? []);
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    },
    [buildUrl],
  );

  useEffect(() => {
    if (!enabled) return;
    void runSearch("");
  }, [enabled, runSearch]);

  useEffect(
    () => () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    },
    [],
  );

  const onQueryChange = (value: string) => {
    setQuery(value);
    setTouched(true);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      void runSearch(value);
    }, debounceMs);
  };

  return { query, setQuery, results, loading, touched, onQueryChange, runSearch };
}
