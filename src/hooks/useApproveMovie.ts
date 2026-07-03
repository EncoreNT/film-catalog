"use client";

import { useCallback } from "react";
import { useRouter } from "next/navigation";
import { approveMovie } from "@/lib/api/client";
import { useApiAction } from "@/hooks/useApiAction";

export function useApproveMovie() {
  const router = useRouter();
  const { execute, loading, error, clearError } = useApiAction(
    async (movieId: number) => {
      await approveMovie(movieId);
      router.refresh();
    },
  );

  const approve = useCallback(
    (movieId: number) => execute(movieId),
    [execute],
  );

  return { approve, loading, error, clearError };
}
