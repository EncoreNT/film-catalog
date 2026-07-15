import type { StorageKind, StorageOption } from "@/lib/shared/storage-types";

export function initialStorageKind(
  storage: { id: number } | null | undefined,
): StorageKind {
  return storage ? "external" : "local";
}

export function initialSelectedStorageId(
  storage: { id: number } | null | undefined,
): string {
  return storage ? String(storage.id) : "";
}

/** null = local disk; number = external drive id. */
export function resolveExternalStorageId(
  storageKind: StorageKind,
  selectedStorageId: string,
): number | null {
  if (storageKind === "local") return null;
  if (selectedStorageId) return parseInt(selectedStorageId, 10);
  return null;
}

export function insertStorageOption(
  storages: StorageOption[],
  created: StorageOption,
): StorageOption[] {
  return [...storages.filter((s) => s.id !== created.id), created].sort(
    (a, b) => a.name.localeCompare(b.name, "ru"),
  );
}
