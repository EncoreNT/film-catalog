function formatShortBytes(bytes: number): string {
  const gb = bytes / (1024 ** 3);
  if (gb >= 1) return `${gb.toFixed(1)} ГБ`;
  const mb = bytes / (1024 ** 2);
  return `${Math.max(1, Math.round(mb))} МБ`;
}

/** Shortfall label when output does not fit; null when space is sufficient or unknown. */
export function formatDiskSpaceFitLabel(
  freeBytes: number | null,
  requiredBytes: number | null,
): string | null {
  if (freeBytes == null || requiredBytes == null) return null;
  if (requiredBytes <= freeBytes) return null;
  const deficit = requiredBytes - freeBytes;
  return formatShortBytes(deficit);
}
