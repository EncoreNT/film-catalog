import { watchInstantFromISODate, watchISODateFromInstant } from "./movie-watch-date";

export type WatchCalendarView = "year" | "month" | "fortnight" | "week";
export type WatchCalendarMode = "calendar" | "recent";
export type WatchCalendarLayout = "calendar" | "timeline";

export function parseWatchCalendarLayout(value: string | string[] | undefined): WatchCalendarLayout {
  return value === "timeline" ? "timeline" : "calendar";
}
export const WATCH_CALENDAR_MODES: { value: WatchCalendarMode; label: string }[] = [
  { value: "calendar", label: "Календарный" },
  { value: "recent", label: "Последние" },
];
export const RECENT_DAY_COUNTS: Record<Exclude<WatchCalendarView, "year">, number> = { month: 30, fortnight: 14, week: 7 };
export const RECENT_PERIOD_LABELS: Record<WatchCalendarView, string> = {
  year: "12 месяцев", month: `${RECENT_DAY_COUNTS.month} дней`,
  fortnight: `${RECENT_DAY_COUNTS.fortnight} дней`, week: `${RECENT_DAY_COUNTS.week} дней`,
};
export const WATCH_CALENDAR_VIEWS: { value: WatchCalendarView; label: string }[] = [
  { value: "year", label: "Год" },
  { value: "month", label: "Месяц" },
  { value: "fortnight", label: "2 недели" },
  { value: "week", label: "Неделя" },
];

export type CalendarWatch = {
  id: number;
  watchedOn: string;
  movie: {
    id: number;
    slug: string;
    title: string;
    year: number | null;
    description: string | null;
    coverUrl: string | null;
    genres: string[];
    rating: number | null;
    ratings: { name: string; rating: number }[];
  };
};

export function parseWatchCalendarQuery(
  query: Record<string, string | string[] | undefined>,
  today: string,
): { date: string; view: WatchCalendarView; mode: WatchCalendarMode } {
  // Dated calendar bookmarks predate the mode parameter and must keep working.
  const mode = query.mode === "calendar" || (query.mode !== "recent" && query.date != null)
    ? "calendar" : "recent";
  let date = today;
  if (mode === "calendar" && typeof query.date === "string") {
    try {
      const parsed = watchInstantFromISODate(query.date);
      // Reserve a year at each edge for padded weeks and period navigation.
      if (parsed.getUTCFullYear() >= 1000 && parsed.getUTCFullYear() <= 9998) date = query.date;
    } catch { /* Invalid bookmarks fall back to today. */ }
  }
  const view = WATCH_CALENDAR_VIEWS.find((item) => item.value === query.view)?.value ?? "year";
  return { date, view, mode };
}

/** Recent periods always follow today's date in the viewer's timezone, even on bookmarked URLs. */
export function watchCalendarToday(timeZone?: string, now = new Date()): string {
  try {
    const parts = new Intl.DateTimeFormat("en", {
      timeZone, year: "numeric", month: "2-digit", day: "2-digit",
    }).formatToParts(now);
    const part = (type: string) => parts.find((item) => item.type === type)!.value;
    return `${part("year")}-${part("month")}-${part("day")}`;
  } catch {
    return watchCalendarToday(undefined, now);
  }
}

function shiftDays(date: Date, count: number): Date {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + count);
  return next;
}

/** Date-only arithmetic: neither the server timezone nor DST can move a viewing day. */
export function buildWatchCalendar(date: string, view: WatchCalendarView, mode: WatchCalendarMode = "calendar") {
  const anchor = watchInstantFromISODate(date);
  if (mode === "recent" || view === "year") {
    const start = mode === "recent"
      ? view === "year"
        ? new Date(Date.UTC(anchor.getUTCFullYear(), anchor.getUTCMonth() - 11, 1))
        : shiftDays(anchor, 1 - RECENT_DAY_COUNTS[view])
      : new Date(Date.UTC(anchor.getUTCFullYear(), 0, 1));
    const end = mode === "recent" ? shiftDays(anchor, 1) : new Date(Date.UTC(anchor.getUTCFullYear() + 1, 0, 1));
    const count = Math.round((end.getTime() - start.getTime()) / 86_400_000);
    const days = Array.from({ length: count }, (_, index) => {
      const day = shiftDays(start, index);
      return { iso: watchISODateFromInstant(day), day: day.getUTCDate(), inMonth: true };
    });
    const columns = view === "month" ? 6 : 7;
    return {
      days, columns, rows: count / columns,
      start: days[0].iso,
      endExclusive: watchISODateFromInstant(end),
    };
  }
  const first = view === "month"
    ? new Date(Date.UTC(anchor.getUTCFullYear(), anchor.getUTCMonth(), 1))
    : anchor;
  const leading = (first.getUTCDay() + 6) % 7;
  const start = shiftDays(first, -leading);
  const monthDays = new Date(Date.UTC(anchor.getUTCFullYear(), anchor.getUTCMonth() + 1, 0)).getUTCDate();
  const count = view === "month" ? Math.ceil((leading + monthDays) / 7) * 7 : view === "week" ? 7 : 14;
  const days = Array.from({ length: count }, (_, index) => {
    const day = shiftDays(start, index);
    return {
      iso: watchISODateFromInstant(day),
      day: day.getUTCDate(),
      inMonth: day.getUTCMonth() === anchor.getUTCMonth(),
    };
  });
  return {
    days,
    columns: 7,
    rows: count / 7,
    start: watchISODateFromInstant(start),
    endExclusive: watchISODateFromInstant(shiftDays(start, count)),
  };
}

/** Group only included dates; omitted days stay blank, with Monday-first positioning. */
export function groupWatchCalendarMonths(days: ReturnType<typeof buildWatchCalendar>["days"]) {
  const months: { iso: string; days: (typeof days[number] | null)[] }[] = [];
  for (const day of days) {
    const iso = day.iso.slice(0, 7);
    if (months.at(-1)?.iso !== iso) {
      const leading = (watchInstantFromISODate(day.iso).getUTCDay() + 6) % 7;
      months.push({ iso, days: Array.from({ length: leading }, () => null) });
    }
    months.at(-1)!.days.push(day);
  }
  return months;
}

export function shiftWatchCalendar(date: string, view: WatchCalendarView, direction: -1 | 1): string {
  const anchor = watchInstantFromISODate(date);
  const next = view === "year"
    ? new Date(Date.UTC(anchor.getUTCFullYear() + direction, 0, 1))
    : view === "month"
    ? new Date(Date.UTC(anchor.getUTCFullYear(), anchor.getUTCMonth() + direction, 1))
    : shiftDays(anchor, direction * (view === "week" ? 7 : 14));
  return watchISODateFromInstant(next);
}

export function watchCalendarLabel(date: string, view: WatchCalendarView, mode: WatchCalendarMode = "calendar"): string {
  const anchor = watchInstantFromISODate(date);
  if (view === "year" && mode === "calendar") return String(anchor.getUTCFullYear());
  if (view === "month" && mode === "calendar") {
    return new Intl.DateTimeFormat("ru-RU", { month: "long", year: "numeric", timeZone: "UTC" }).format(anchor).replace(/ г\.$/, "");
  }
  const range = buildWatchCalendar(date, view, mode);
  const format = new Intl.DateTimeFormat("ru-RU", { day: "numeric", month: "short", timeZone: "UTC" });
  const start = watchInstantFromISODate(range.start);
  const end = watchInstantFromISODate(mode === "recent" ? date : range.days.at(-1)!.iso);
  const firstYear = start.getUTCFullYear() !== end.getUTCFullYear() ? ` ${start.getUTCFullYear()}` : "";
  return `${format.format(start)}${firstYear} - ${format.format(end)}, ${end.getUTCFullYear()}`;
}

export function watchCalendarHref(date: string, view: WatchCalendarView, mode: WatchCalendarMode = "calendar", timeZone?: string, layout: WatchCalendarLayout = "calendar"): string {
  const params = mode === "recent" ? new URLSearchParams({ mode, view }) : new URLSearchParams({ date, view });
  if (mode === "recent" && timeZone) params.set("timeZone", timeZone);
  if (layout === "timeline") params.set("layout", layout);
  return `/calendar?${params}`;
}
