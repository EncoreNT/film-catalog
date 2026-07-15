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
) {
  const [storageKind, setStorageKindState] = useState<StorageKind>(() =>
    initialStorageKind(initialExternalStorage),
  );
  const [storages, setStorages] = useState<StorageOption[]>([]);
  const [selectedStorageId, setSelectedStorageId] = useState(() =>
    initialSelectedStorageId(initialExternalStorage),
  );

  useEffect(() => {
    void apiFetch<{ storages?: StorageOption[] }>("/api/storages").then(
      (d) => setStorages(d.storages ?? []),
    );
  }, []);

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
    createExternalStorage,
    validateStorage,
    resolveExternalStorageId: resolveExternalStorageIdForSubmit,
  };
}
