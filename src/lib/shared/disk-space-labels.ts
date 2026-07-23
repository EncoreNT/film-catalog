import { formatBytes } from "@/lib/shared/format-bytes";

/** Shortfall label when output does not fit; null when space is sufficient or unknown. */
export function formatDiskSpaceFitLabel(
  freeBytes: number | null,
  requiredBytes: number | null,
): string | null {
  if (freeBytes == null || requiredBytes == null) return null;
  if (requiredBytes <= freeBytes) return null;
  const deficit = requiredBytes - freeBytes;
  return formatBytes(deficit, { unit: "short" }) ?? "—";
}
