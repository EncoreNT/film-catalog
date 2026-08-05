/** Snapshot of release file fields used for «скачан» policy (per Release, not Movie). */
export type ReleaseDownloadedAtContext = {
  fileDownloadedAt: Date | null;
  fileHash: string | null;
  fileSize: number | null;
};

/**
 * «Скачан» фиксируется на релизе и по умолчанию не меняется при move/mtime/touch.
 * Перечитываем с диска только если нет даты или файл заменён: изменились и size, и hash.
 */
export function resolveReleaseFileDownloadedAt(
  existing: ReleaseDownloadedAtContext,
  nextFromStat: Date,
  nextHash: string | null,
  nextSize: number | null,
): Date {
  if (existing.fileDownloadedAt == null) {
    return nextFromStat;
  }

  const hashChanged =
    nextHash != null &&
    existing.fileHash != null &&
    nextHash !== existing.fileHash;
  const sizeChanged =
    nextSize != null &&
    existing.fileSize != null &&
    nextSize !== existing.fileSize;

  if (hashChanged && sizeChanged) {
    return nextFromStat;
  }

  return existing.fileDownloadedAt;
}
