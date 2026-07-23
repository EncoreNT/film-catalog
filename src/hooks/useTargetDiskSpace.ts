"use client";

import { useEffect, useMemo, useState } from "react";
import { formatDiskSpaceFitLabel } from "@/lib/shared/disk-space-labels";
import { formatArchiveTotalSize } from "@/lib/shared/format";

export function useTargetDiskSpace({
  enabled,
  targetDirRuntime,
  requiredBytes,
}: {
  enabled: boolean;
  targetDirRuntime: string;
  requiredBytes: number | null | undefined;
}) {
  const [freeBytes, setFreeBytes] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [hasFetched, setHasFetched] = useState(false);

  useEffect(() => {
    if (!enabled || !targetDirRuntime.trim()) {
      setFreeBytes(null);
      setLoading(false);
      setHasFetched(false);
      return;
    }

    setLoading(true);
    setFreeBytes(null);
    setHasFetched(false);

    const timer = window.setTimeout(() => {
      void fetch(`/api/disk-space?path=${encodeURIComponent(targetDirRuntime)}`)
        .then((res) => (res.ok ? res.json() : null))
        .then((data: { freeBytes?: number } | null) => {
          setFreeBytes(typeof data?.freeBytes === "number" ? data.freeBytes : null);
        })
        .catch(() => setFreeBytes(null))
        .finally(() => {
          setLoading(false);
          setHasFetched(true);
        });
    }, 400);

    return () => window.clearTimeout(timer);
  }, [enabled, targetDirRuntime]);

  const shortfall = useMemo(
    () => (loading ? null : formatDiskSpaceFitLabel(freeBytes, requiredBytes ?? null)),
    [freeBytes, loading, requiredBytes],
  );

  const statusLine = useMemo(() => {
    if (!targetDirRuntime.trim() || loading || shortfall || !hasFetched) return null;
    const freeLabel = formatArchiveTotalSize(freeBytes);
    return freeLabel ? `Свободно: ${freeLabel}` : null;
  }, [hasFetched, loading, shortfall, freeBytes, targetDirRuntime]);

  const checking = Boolean(
    targetDirRuntime.trim() && enabled && (loading || !hasFetched),
  );

  return {
    freeBytes,
    loading: checking,
    shortfall,
    statusLine,
    reset: () => {
      setFreeBytes(null);
      setLoading(false);
      setHasFetched(false);
    },
  };
}
