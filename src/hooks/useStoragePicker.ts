"use client";

import { useCallback, useEffect, useState } from "react";
import type { StorageKind, StorageOption } from "@/lib/shared/storage-types";
import {
  initialSelectedStorageId,
  initialStorageKind,
  insertStorageOption,
  resolveExternalStorageId,
} from "@/lib/shared/storage-picker-state";
import { validateStorageSelection } from "@/lib/shared/storage-validation";
import { apiFetch } from "@/lib/api/client";

interface InitialExternalStorage {
  id: number;
  name: string;
}

export function useStoragePicker(
  initialExternalStorage?: InitialExternalStorage | null,
  options?: { defaultKind?: StorageKind },
) {
  const [storageKind, setStorageKindState] = useState<StorageKind>(
    () => options?.defaultKind ?? initialStorageKind(initialExternalStorage),
  );
  const [storages, setStorages] = useState<StorageOption[]>([]);
  const [selectedStorageId, setSelectedStorageId] = useState(() =>
    initialSelectedStorageId(initialExternalStorage),
  );

  const refreshStorages = useCallback(
    () =>
      apiFetch<{ storages: StorageOption[] }>("/api/storages")
        .then((data) => setStorages(data.storages))
        .catch(() => {
          // Keep selectable disks, but never present stale occupancy as current data.
          setStorages((current) =>
            current.map((storage) => ({ ...storage, usage: undefined })),
          );
        }),
    [],
  );

  useEffect(() => {
    void refreshStorages();
    window.addEventListener("focus", refreshStorages);
    return () => window.removeEventListener("focus", refreshStorages);
  }, [refreshStorages]);

  const setStorageKind = useCallback((kind: StorageKind) => {
    setStorageKindState(kind);
    if (kind === "local") {
      setSelectedStorageId("");
    }
  }, []);

  const createExternalStorage = useCallback(async (name: string) => {
    const created = await apiFetch<StorageOption>(
      "/api/storages",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim() }),
      },
      "Не удалось создать внешний диск",
    );
    setStorages((prev) => insertStorageOption(prev, created));
    setSelectedStorageId(String(created.id));
    setStorageKindState("external");
  }, []);

  const validateStorage = (): string | null =>
    validateStorageSelection(storageKind, selectedStorageId);

  const resolveExternalStorageIdForSubmit = async (): Promise<number | null> =>
    resolveExternalStorageId(storageKind, selectedStorageId);

  return {
    storageKind,
    setStorageKind,
    selectedStorageId,
    setSelectedStorageId,
    externalStorages: storages,
    refreshStorages,
    createExternalStorage,
    validateStorage,
    resolveExternalStorageId: resolveExternalStorageIdForSubmit,
  };
}
