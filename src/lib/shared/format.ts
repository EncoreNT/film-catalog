export function formatDate(date: Date | string | null | undefined): string {
  if (!date) return "—";
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
  const startOfToday = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate(),
  );
  const startOfDay = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const dayMs = 24 * 60 * 60 * 1000;
  const diffDays = Math.round(
    (startOfToday.getTime() - startOfDay.getTime()) / dayMs,
  );
  if (diffDays === 0) return "сегодня";
  if (diffDays === 1) return "вчера";
  if (diffDays > 1 && diffDays <= 30) return `${diffDays} дн. назад`;
  return null;
}

export function formatDuration(
  seconds: number | null | undefined,
  style: "short" | "long" = "short",
): string | null {
  if (seconds == null || seconds <= 0) return null;
  const total = Math.round(seconds);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  if (style === "long") {
    if (h > 0) {
      return `${h} ч ${m} мин`;
    }
    return `${m} мин`;
  }
  if (h > 0) {
    return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  }
  return `${m}:${String(s).padStart(2, "0")}`;
}

/** File size in gibibytes (GiB), labeled as «ГБ» for the UI. */
export function formatFileSizeGB(
  bytes: number | null | undefined,
): string | null {
  if (bytes == null || bytes <= 0) return null;
  const gb = bytes / 1024 ** 3;
  return `${gb.toFixed(2)} ГБ`;
}
