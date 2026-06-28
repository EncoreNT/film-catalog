"use client";

import { useEffect, useState } from "react";
import type { StorageKind, StorageOption } from "@/components/StoragePicker";

interface InitialStorage {
  id: number;
  type: "LOCAL" | "EXTERNAL";
}

function initialKind(storage: InitialStorage | null | undefined): StorageKind {
  return storage?.type === "EXTERNAL" ? "external" : "local";
}

function initialSelectedId(
  storage: InitialStorage | null | undefined,
): string {
  return storage?.type === "EXTERNAL" ? String(storage.id) : "";
}

export function useStoragePicker(initialStorage?: InitialStorage | null) {
  const [storageKind, setStorageKind] = useState<StorageKind>(() =>
    initialKind(initialStorage),
  );
  const [storages, setStorages] = useState<StorageOption[]>([]);
  const [selectedStorageId, setSelectedStorageId] = useState(() =>
    initialSelectedId(initialStorage),
  );
  const [newStorageName, setNewStorageName] = useState("");

  const externalStorages = storages.filter((s) => s.type === "EXTERNAL");

  useEffect(() => {
    fetch("/api/storages")
      .then((r) => r.json())
      .then((d) => setStorages(d.storages ?? []));
  }, []);

  const validateStorage = (): string | null => {
    if (
      storageKind === "external" &&
      !selectedStorageId &&
      !newStorageName.trim()
    ) {
      return "Укажите название внешнего диска";
    }
    return null;
  };

  const resolveStorageId = async (): Promise<number | null> => {
    if (storageKind === "local") {
      const local = storages.find((s) => s.type === "LOCAL");
      if (local) return local.id;
      const res = await fetch("/api/storages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "Локальный диск", type: "LOCAL" }),
      });
      const created = await res.json();
      return created.id;
    }
    if (selectedStorageId) return parseInt(selectedStorageId, 10);
    if (newStorageName.trim()) {
      const res = await fetch("/api/storages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newStorageName.trim(), type: "EXTERNAL" }),
      });
      const created = await res.json();
      return created.id;
    }
    return null;
  };

  return {
    storageKind,
    setStorageKind,
    selectedStorageId,
    setSelectedStorageId,
    newStorageName,
    setNewStorageName,
    externalStorages,
    validateStorage,
    resolveStorageId,
  };
}
