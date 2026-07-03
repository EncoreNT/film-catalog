"use client";

import { useCallback, useState } from "react";

export function useApiAction<TArgs extends unknown[] = [], TResult = void>(
  action: (...args: TArgs) => Promise<TResult>,
) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const execute = useCallback(
    async (...args: TArgs): Promise<TResult | null> => {
      setLoading(true);
      setError(null);
      try {
        return await action(...args);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Ошибка");
        return null;
      } finally {
        setLoading(false);
      }
    },
    [action],
  );

  const clearError = useCallback(() => setError(null), []);

  return { execute, loading, error, clearError, setError };
}
