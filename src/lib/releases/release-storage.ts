export const LOCAL_STORAGE_LABEL = "Локальный диск";
export const UNKNOWN_EXTERNAL_STORAGE_LABEL = "Без названия";

export function releaseHasExternalStorage(release: {
  externalStorageId?: number | null;
  externalStorage?: { id: number } | null;
}): boolean {
  return release.externalStorage != null || release.externalStorageId != null;
}

export function releaseStorageLabel(release: {
  externalStorage?: { name: string } | null;
  filePath?: string | null;
}): string | null {
  if (release.externalStorage) return release.externalStorage.name;
  if (release.filePath) return LOCAL_STORAGE_LABEL;
  return null;
}

export function releaseStorageIsExternal(release: {
  externalStorageId?: number | null;
  externalStorage?: { id: number } | null;
}): boolean {
  return releaseHasExternalStorage(release);
}

export function externalStorageNameFromRelease(release: {
  externalStorageId?: number | null;
  externalStorage?: { name: string } | null;
}): string | null {
  if (release.externalStorage == null && release.externalStorageId == null) {
    return null;
  }
  return release.externalStorage?.name ?? UNKNOWN_EXTERNAL_STORAGE_LABEL;
}
