import type { StorageKind } from "@/lib/shared/storage-types";

export function validateStorageSelection(
  storageKind: StorageKind,
  selectedStorageId: string,
): string | null {
  if (storageKind === "external" && !selectedStorageId) {
    return "Выберите внешний диск или создайте новый";
  }
  return null;
}
