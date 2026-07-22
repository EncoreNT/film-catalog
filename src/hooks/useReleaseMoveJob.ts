"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api/client";
import type { SerializedMove } from "@/lib/releases/move-serialize";
import { isMoveTerminal } from "@/lib/releases/move-display";

export function useReleaseMoveJob({
  movieId,
  releaseId,
  onSucceeded,
}: {
  movieId: number;
  releaseId: number;
  onSucceeded?: (job: SerializedMove) => void;
}) {
  const router = useRouter();
  const [moveJob, setMoveJob] = useState<SerializedMove | null>(null);
  const [activeExport, setActiveExport] = useState(false);
  const [activeBuild, setActiveBuild] = useState(false);
  const [loading, setLoading] = useState(false);

  const refreshMoveJob = useCallback(async (jobId: number) => {
    return apiFetch<SerializedMove>(
      `/api/moves/${jobId}`,
      undefined,
      "Не удалось загрузить перемещение",
    );
  }, []);

  const loadActiveMove = useCallback(async () => {
    if (!releaseId) {
      setMoveJob(null);
      setActiveExport(false);
      setActiveBuild(false);
      return null;
    }
    const res = await fetch(
      `/api/movies/${movieId}/releases/${releaseId}/move`,
    );
    if (!res.ok) {
      setMoveJob(null);
      return null;
    }
    const data = (await res.json()) as {
      job: SerializedMove | null;
      activeExport?: boolean;
      activeBuild?: boolean;
    };
    setActiveExport(Boolean(data.activeExport));
    setActiveBuild(Boolean(data.activeBuild));
    if (!data.job) {
      setMoveJob(null);
      return null;
    }
    setMoveJob(data.job);
    return data.job;
  }, [movieId, releaseId]);

  useEffect(() => {
    void loadActiveMove();
  }, [loadActiveMove]);

  useEffect(() => {
    if (!moveJob || isMoveTerminal(moveJob.status)) return;
    const timer = setInterval(() => {
      void refreshMoveJob(moveJob.id)
        .then((next) => {
          setMoveJob(next);
          if (next.status === "SUCCEEDED") {
            onSucceeded?.(next);
            router.refresh();
            setMoveJob(null);
          }
        })
        .catch(() => undefined);
    }, 3000);
    return () => clearInterval(timer);
  }, [moveJob, onSucceeded, refreshMoveJob, router]);

  const cancelMove = useCallback(async () => {
    if (!moveJob) return null;
    setLoading(true);
    try {
      const next = await apiFetch<SerializedMove>(
        `/api/moves/${moveJob.id}/cancel`,
        { method: "POST" },
        "Не удалось отменить перемещение",
      );
      setMoveJob(next);
      return next;
    } finally {
      setLoading(false);
    }
  }, [moveJob]);

  const moveActive = moveJob != null && !isMoveTerminal(moveJob.status);

  return {
    moveJob,
    setMoveJob,
    moveActive,
    activeExport,
    activeBuild,
    loading,
    setLoading,
    refreshMoveJob,
    loadActiveMove,
    cancelMove,
  };
}

export type ReleaseMoveJobState = ReturnType<typeof useReleaseMoveJob>;
