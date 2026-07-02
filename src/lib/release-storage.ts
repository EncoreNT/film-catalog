export const LOCAL_STORAGE_LABEL = "Локальный диск";

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
