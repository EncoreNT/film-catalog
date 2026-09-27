const INVALID_WATCH_DATE = "Некорректная дата просмотра";
const FUTURE_WATCH_DATE = "Дата просмотра не может быть в будущем";

/** Calendar day stored as UTC midnight, so one instant matches one date. */
export function watchInstantFromISODate(iso: string): Date {
  const match = iso.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) throw new Error(INVALID_WATCH_DATE);

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    throw new Error(INVALID_WATCH_DATE);
  }
  return date;
}

export function watchISODateFromInstant(date: Date): string {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/** UTC calendar day of an ISO datetime (`2024-06-01T12:00:00.000Z` → `2024-06-01`). */
export function calendarISOFromDateTime(value: string): string {
  const datePart = value.slice(0, 10);
  watchInstantFromISODate(datePart);
  return datePart;
}

/** One UTC day ahead, so a client ahead of UTC can still log "today". */
export function maxAllowedWatchISODate(now = new Date()): string {
  const latest = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1),
  );
  return watchISODateFromInstant(latest);
}

export function assertWatchDateAllowed(iso: string, now = new Date()): Date {
  const instant = watchInstantFromISODate(iso);
  if (iso > maxAllowedWatchISODate(now)) {
    throw new Error(FUTURE_WATCH_DATE);
  }
  return instant;
}

export type MovieWatchEntry = {
  id: number;
  watchedOn: string;
};

/** Newest viewing day first. */
export function sortWatchesByDate<T extends { watchedOn: string }>(
  watches: T[],
): T[] {
  return [...watches].sort((a, b) => {
    if (a.watchedOn === b.watchedOn) return 0;
    return a.watchedOn < b.watchedOn ? 1 : -1;
  });
}

export function formatWatchCount(count: number): string {
  const mod10 = count % 10;
  const mod100 = count % 100;
  let word = "просмотров";
  if (mod10 === 1 && mod100 !== 11) word = "просмотр";
  else if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) {
    word = "просмотра";
  }
  return `${count} ${word}`;
}
