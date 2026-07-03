"use client";

import { useCallback, useEffect, useState } from "react";
import type { StorageKind, StorageOption } from "@/lib/shared/storage-types";

interface InitialExternalStorage {
  id: number;
  name: string;
}

function initialKind(
  storage: InitialExternalStorage | null | undefined,
): StorageKind {
  return storage ? "external" : "local";
}

function initialSelectedId(
  storage: InitialExternalStorage | null | undefined,
): string {
  return storage ? String(storage.id) : "";
}

export function useStoragePicker(
  initialExternalStorage?: InitialExternalStorage | null,
) {
  const [storageKind, setStorageKindState] = useState<StorageKind>(() =>
    initialKind(initialExternalStorage),
  );
  const [storages, setStorages] = useState<StorageOption[]>([]);
  const [selectedStorageId, setSelectedStorageId] = useState(() =>
    initialSelectedId(initialExternalStorage),
  );

  useEffect(() => {
    fetch("/api/storages")
      .then((r) => r.json())
      .then((d) => setStorages(d.storages ?? []));
  }, []);

  const setStorageKind = useCallback((kind: StorageKind) => {
    setStorageKindState(kind);
    if (kind === "local") {
      setSelectedStorageId("");
    }
  }, []);

  const createExternalStorage = useCallback(async (name: string) => {
    const res = await fetch("/api/storages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: name.trim() }),
    });
    const created = (await res.json()) as StorageOption & { error?: string };
    if (!res.ok) {
      throw new Error(created.error ?? "Не удалось создать внешний диск");
    }
    setStorages((prev) =>
      [...prev.filter((s) => s.id !== created.id), created].sort((a, b) =>
        a.name.localeCompare(b.name, "ru"),
      ),
    );
    setSelectedStorageId(String(created.id));
    setStorageKindState("external");
  }, []);

  const validateStorage = (): string | null => {
    if (storageKind === "external" && !selectedStorageId) {
      return "Выберите внешний диск или создайте новый";
    }
    return null;
  };

  /** null = local disk; number = external drive id. */
  const resolveExternalStorageId = async (): Promise<number | null> => {
    if (storageKind === "local") return null;
    if (selectedStorageId) return parseInt(selectedStorageId, 10);
    return null;
  };

  return {
    storageKind,
    setStorageKind,
    selectedStorageId,
    setSelectedStorageId,
    externalStorages: storages,
    createExternalStorage,
    validateStorage,
    resolveExternalStorageId,
  };
}
