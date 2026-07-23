import { formatDisplayDate, startOfDay } from "@/lib/shared/calendar";
import {
  formatArchiveTotalDuration,
  formatBuildEtaSeconds,
  formatDuration,
  formatDurationDelta,
} from "@/lib/shared/duration-format";
import {
  formatArchiveTotalSize,
  formatBytes,
  formatFileSizeGB,
} from "@/lib/shared/format-bytes";

export {
  formatArchiveTotalDuration,
  formatArchiveTotalSize,
  formatBuildEtaSeconds,
  formatBytes,
  formatDuration,
  formatDurationDelta,
  formatFileSizeGB,
};

export function formatDate(date: Date | string | null | undefined): string {
  if (!date) return "—";
  if (typeof date === "string") {
    const iso = date.slice(0, 10);
    if (/^\d{4}-\d{2}-\d{2}$/.test(iso)) {
      return formatDisplayDate(iso);
    }
  }
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

export function formatRelativeDate(
  date: Date | string | null | undefined,
): string | null {
  if (!date) return null;
  const d = typeof date === "string" ? new Date(date) : date;
  const today = new Date();
  const startOfToday = startOfDay(today);
  const dayStart = startOfDay(d);
  const dayMs = 24 * 60 * 60 * 1000;
  const diffDays = Math.round(
    (startOfToday.getTime() - dayStart.getTime()) / dayMs,
  );
  if (diffDays === 0) return "сегодня";
  if (diffDays === 1) return "вчера";
  if (diffDays > 1 && diffDays <= 30) return `${diffDays} дн. назад`;
  return null;
}

export { formatDisplayDate, startOfDay } from "@/lib/shared/calendar";
