import { secondsToHmsParts } from "@/lib/shared/duration-parts";

export type DurationDisplayMode = "display" | "hms" | "delta" | "eta" | "archive";

const pad2 = (n: number) => String(n).padStart(2, "0");

/** Human-readable delta for inline badges (seconds or minutes). */
export function formatDurationDelta(seconds: number): string {
  if (seconds < 60) {
    return seconds < 10
      ? `${seconds.toFixed(1).replace(/\.0$/, "")} с`
      : `${Math.round(seconds)} с`;
  }
  const minutes = Math.floor(seconds / 60);
  const rest = Math.round(seconds % 60);
  if (rest === 0) return `${minutes} мин`;
  return `${minutes} мин ${rest} с`;
}

/** Build queue ETA with ~ prefix and «меньше минуты» for short waits. */
export function formatBuildEtaSeconds(
  seconds: number | null | undefined,
): string | null {
  if (seconds == null || !Number.isFinite(seconds)) return null;

  const total = Math.max(0, Math.floor(seconds));
  if (total < 45) return "меньше минуты";

  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const secs = total % 60;

  if (hours <= 0 && total < 600) {
    if (minutes <= 0) return `~${secs} с`;
    if (secs > 0) return `~${minutes} мин ${secs} с`;
    return minutes === 1 ? "~1 мин" : `~${minutes} мин`;
  }

  if (hours <= 0) {
    return minutes === 1 ? "~1 мин" : `~${minutes} мин`;
  }

  if (minutes <= 0) {
    return hours === 1 ? "~1 ч" : `~${hours} ч`;
  }

  return hours === 1 ? `~1 ч ${minutes} мин` : `~${hours} ч ${minutes} мин`;
}

/** Human-readable total runtime for archive / franchise summaries. */
export function formatArchiveTotalDuration(
  seconds: number | null | undefined,
): string | null {
  return formatDuration(seconds, "archive");
}

/**
 * Unified duration formatter.
 *
 * - `display` — card/detail: `2:15:00` or `15:30`; long variant via style param
 * - `hms` — form fields: always `H:MM:SS`
 * - `delta` — mismatch badges
 * - `eta` — build queue (delegates to formatBuildEtaSeconds)
 * - `archive` — totals with days/hours
 */
export function formatDuration(
  seconds: number | null | undefined,
  style: "short" | "long",
): string | null;
export function formatDuration(
  seconds: number | null | undefined,
  mode?: DurationDisplayMode,
  style?: "short" | "long",
): string | null;
export function formatDuration(
  seconds: number | null | undefined,
  modeOrStyle: DurationDisplayMode | "short" | "long" = "display",
  style: "short" | "long" = "short",
): string | null {
  const mode: DurationDisplayMode =
    modeOrStyle === "short" || modeOrStyle === "long" ? "display" : modeOrStyle;
  const resolvedStyle =
    modeOrStyle === "short" || modeOrStyle === "long" ? modeOrStyle : style;
  if (seconds == null || seconds <= 0) return null;

  if (mode === "delta") return formatDurationDelta(seconds);
  if (mode === "eta") return formatBuildEtaSeconds(seconds);

  if (mode === "archive") {
    const totalHours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (totalHours >= 24) {
      const days = Math.floor(totalHours / 24);
      const hours = totalHours % 24;
      return `${days} д ${hours} ч`;
    }
    if (totalHours > 0) {
      return `${totalHours} ч ${minutes} мин`;
    }
    return `${minutes} мин`;
  }

  if (mode === "hms") {
    const { h, m, s } = secondsToHmsParts(Math.round(seconds));
    return `${h}:${pad2(m)}:${pad2(s)}`;
  }

  const { h, m, s } = secondsToHmsParts(seconds);
  if (resolvedStyle === "long") {
    if (h > 0) return `${h} ч ${m} мин`;
    return `${m} мин`;
  }
  if (h > 0) {
    return `${h}:${pad2(m)}:${pad2(s)}`;
  }
  return `${m}:${pad2(s)}`;
}
