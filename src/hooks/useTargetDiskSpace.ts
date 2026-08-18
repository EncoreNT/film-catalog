"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { apiFetch } from "@/lib/api/client";
import { formatDiskSpaceFitLabel } from "@/lib/shared/disk-space-labels";
import { formatArchiveTotalSize } from "@/lib/shared/format";
import type { UnmountedWslDrive } from "@/lib/shared/disk-space-types";

type DiskSpaceResponse = {
  freeBytes?: number;
  unmounted?: boolean;
  driveLetter?: string;
  mountPoint?: string;
  error?: string;
};

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
  const [unmountedDrive, setUnmountedDrive] = useState<UnmountedWslDrive | null>(null);
  const [loading, setLoading] = useState(false);
  const [hasFetched, setHasFetched] = useState(false);
  const [mounting, setMounting] = useState(false);
  const [mountError, setMountError] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    setMountError(null);
  }, [targetDirRuntime]);

  useEffect(() => {
    if (!enabled || !targetDirRuntime.trim()) {
      setFreeBytes(null);
      setUnmountedDrive(null);
      setLoading(false);
      setHasFetched(false);
      return;
    }

    setLoading(true);
    setFreeBytes(null);
    setUnmountedDrive(null);
    setHasFetched(false);

    const timer = window.setTimeout(() => {
      void fetch(`/api/disk-space?path=${encodeURIComponent(targetDirRuntime)}`)
        .then((res) => (res.ok ? res.json() : null))
        .then((data: DiskSpaceResponse | null) => {
          if (data?.unmounted && data.driveLetter && data.mountPoint) {
            setUnmountedDrive({
              letter: data.driveLetter,
              mountPoint: data.mountPoint,
            });
            setFreeBytes(null);
            return;
          }
          setUnmountedDrive(null);
          setFreeBytes(typeof data?.freeBytes === "number" ? data.freeBytes : null);
        })
        .catch(() => {
          setFreeBytes(null);
          setUnmountedDrive(null);
        })
        .finally(() => {
          setLoading(false);
          setHasFetched(true);
        });
    }, 400);

    return () => window.clearTimeout(timer);
  }, [enabled, targetDirRuntime, reloadToken]);

  const shortfall = useMemo(
    () =>
      unmountedDrive
        ? null
        : loading
          ? null
          : formatDiskSpaceFitLabel(freeBytes, requiredBytes ?? null),
    [freeBytes, loading, requiredBytes, unmountedDrive],
  );

  const statusLine = useMemo(() => {
    if (
      !targetDirRuntime.trim() ||
      loading ||
      shortfall ||
      !hasFetched ||
      unmountedDrive
    ) {
      return null;
    }
    const freeLabel = formatArchiveTotalSize(freeBytes);
    return freeLabel ? `Свободно: ${freeLabel}` : null;
  }, [
    hasFetched,
    loading,
    shortfall,
    freeBytes,
    targetDirRuntime,
    unmountedDrive,
  ]);

  const checking = Boolean(
    targetDirRuntime.trim() && enabled && (loading || !hasFetched),
  );

  const mountDrive = useCallback(async (): Promise<boolean> => {
    if (!targetDirRuntime.trim()) return false;
    setMounting(true);
    setMountError(null);
    try {
      await apiFetch(
        "/api/wsl-drive/mount",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ path: targetDirRuntime }),
        },
        "Не удалось подключить диск",
      );
      setReloadToken((token) => token + 1);
      return true;
    } catch (err) {
      setMountError(
        err instanceof Error ? err.message : "Не удалось подключить диск",
      );
      return false;
    } finally {
      setMounting(false);
    }
  }, [targetDirRuntime]);

  return {
    freeBytes,
    loading: checking,
    shortfall,
    statusLine,
    unmountedDrive,
    mounting,
    mountError,
    mountDrive,
    reset: () => {
      setFreeBytes(null);
      setUnmountedDrive(null);
      setLoading(false);
      setHasFetched(false);
      setMountError(null);
    },
  };
}
