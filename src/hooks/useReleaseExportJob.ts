"use client";

import { useCallback, useEffect, useState } from "react";
import { apiFetch } from "@/lib/api/client";
import type { SerializedExport } from "@/lib/releases/export-serialize";
import { isExportTerminal } from "@/lib/releases/export-display";

export function useReleaseExportJob({
  movieId,
  releaseId,
  onSucceeded,
}: {
  movieId: number;
  releaseId: number;
  onSucceeded?: (job: SerializedExport) => void;
}) {
  const [exportJob, setExportJob] = useState<SerializedExport | null>(null);
  const [loading, setLoading] = useState(false);

  const refreshExportJob = useCallback(async (jobId: number) => {
    return apiFetch<SerializedExport>(
      `/api/exports/${jobId}`,
      undefined,
      "Не удалось загрузить экспорт",
    );
  }, []);

  const loadActiveExport = useCallback(async () => {
    if (!releaseId) {
      setExportJob(null);
      return null;
    }
    const res = await fetch(
      `/api/movies/${movieId}/releases/${releaseId}/export`,
    );
    if (!res.ok) {
      setExportJob(null);
      return null;
    }
    const data = (await res.json()) as { job: SerializedExport | null };
    if (!data.job) {
      setExportJob(null);
      return null;
    }
    setExportJob(data.job);
    return data.job;
  }, [movieId, releaseId]);

  useEffect(() => {
    let cancelled = false;
    void loadActiveExport().then((job) => {
      if (cancelled || !job || !isExportTerminal(job.status)) return;
      if (job.status === "SUCCEEDED") {
        onSucceeded?.(job);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [loadActiveExport, onSucceeded]);

  useEffect(() => {
    if (!exportJob || isExportTerminal(exportJob.status)) return;
    const timer = setInterval(() => {
      void refreshExportJob(exportJob.id)
        .then((next) => {
          setExportJob(next);
          if (next.status === "SUCCEEDED") {
            onSucceeded?.(next);
            setExportJob(null);
          }
        })
        .catch(() => undefined);
    }, 3000);
    return () => clearInterval(timer);
  }, [exportJob, onSucceeded, refreshExportJob]);

  const cancelExport = useCallback(async () => {
    if (!exportJob) return null;
    setLoading(true);
    try {
      const next = await apiFetch<SerializedExport>(
        `/api/exports/${exportJob.id}/cancel`,
        { method: "POST" },
        "Не удалось отменить экспорт",
      );
      setExportJob(next);
      return next;
    } finally {
      setLoading(false);
    }
  }, [exportJob]);

  const exportActive =
    exportJob != null && !isExportTerminal(exportJob.status);

  return {
    exportJob,
    setExportJob,
    exportActive,
    loading,
    setLoading,
    refreshExportJob,
    loadActiveExport,
    cancelExport,
  };
}

export type ReleaseExportJobState = ReturnType<typeof useReleaseExportJob>;
