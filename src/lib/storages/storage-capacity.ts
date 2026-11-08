/** Disk-label units are decimal; file byte sizes need no conversion before comparison. */
export type CapacityUnit = "gb" | "tb";
const UNIT_BYTES = { gb: 1_000_000_000, tb: 1_000_000_000_000 } as const;

export function parseCapacityBytes(
  value: string,
  unit: CapacityUnit,
): number | null {
  const normalized = value.trim().replace(",", ".");
  if (!normalized) return null;
  if (!/^\d+(\.\d+)?$/.test(normalized)) return NaN;
  const bytes = Math.round(Number(normalized) * UNIT_BYTES[unit]);
  return Number.isSafeInteger(bytes) && bytes > 0 ? bytes : NaN;
}

export function capacityValue(
  bytes: number | null | undefined,
  unit: CapacityUnit,
): string {
  return bytes == null ? "" : String(bytes / UNIT_BYTES[unit]);
}

export function capacityDraft(bytes: number | null | undefined) {
  const unit: CapacityUnit =
    bytes != null && bytes < UNIT_BYTES.tb ? "gb" : "tb";
  return { value: capacityValue(bytes, unit), unit };
}

export function storageUsagePercent(
  knownBytes: number,
  capacityBytes: number | null | undefined,
): number | null {
  return capacityBytes != null && capacityBytes > 0
    ? (knownBytes / capacityBytes) * 100
    : null;
}
