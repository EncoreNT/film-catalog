export type FormatBytesUnit = "gb" | "short" | "archive" | "binary";

export interface FormatBytesOptions {
  /** Decimal places for GiB output (default depends on unit). */
  precision?: number;
  /** Output style. */
  unit?: FormatBytesUnit;
}

/**
 * Unified byte formatter.
 *
 * - `gb` — file sizes with 2 decimals (default for release files)
 * - `short` — deficit labels: 1 decimal GB or rounded MB
 * - `archive` — totals: TiB above 1 TiB, rounded GiB above 100 GiB
 * - `binary` — explicit binary unit labels (ГиБ/ТиБ), including zero
 */
export function formatBytes(
  bytes: number | null | undefined,
  options: FormatBytesOptions = {},
): string | null {
  if (options.unit === "binary") {
    if (bytes == null || !Number.isFinite(bytes) || bytes < 0) return null;
    const power =
      bytes >= 1024 ** 4
        ? 4
        : bytes >= 1024 ** 3
          ? 3
          : bytes >= 1024 ** 2
            ? 2
            : bytes >= 1024
              ? 1
              : 0;
    const labels = ["Б", "КиБ", "МиБ", "ГиБ", "ТиБ"];
    return `${new Intl.NumberFormat("ru-RU", { maximumFractionDigits: options.precision ?? 2 }).format(bytes / 1024 ** power)} ${labels[power]}`;
  }
  if (bytes == null || bytes <= 0) return null;

  const unit = options.unit ?? "gb";

  if (unit === "archive") {
    const tebibytes = bytes / 1024 ** 4;
    if (tebibytes >= 1) {
      return `${tebibytes.toFixed(1)} ТБ`;
    }
    const gibibytes = bytes / 1024 ** 3;
    if (gibibytes >= 100) {
      return `${Math.round(gibibytes)} ГБ`;
    }
    return `${gibibytes.toFixed(1)} ГБ`;
  }

  if (unit === "short") {
    const gb = bytes / 1024 ** 3;
    if (gb >= 1) return `${gb.toFixed(1)} ГБ`;
    const mb = bytes / 1024 ** 2;
    return `${Math.max(1, Math.round(mb))} МБ`;
  }

  const precision = options.precision ?? 2;
  const gb = bytes / 1024 ** 3;
  return `${gb.toFixed(precision)} ГБ`;
}

/** @deprecated Use formatBytes(bytes, { unit: 'gb' }) */
export function formatFileSizeGB(
  bytes: number | null | undefined,
): string | null {
  return formatBytes(bytes, { unit: "gb" });
}

/** @deprecated Use formatBytes(bytes, { unit: 'archive' }) */
export function formatArchiveTotalSize(
  bytes: number | null | undefined,
): string | null {
  return formatBytes(bytes, { unit: "archive" });
}
