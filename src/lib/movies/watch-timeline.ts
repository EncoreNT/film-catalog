import type { CalendarWatch } from "./watch-calendar";
import { watchInstantFromISODate } from "./movie-watch-date";

export type WatchTimelineDay = {
  iso: string;
  watches: CalendarWatch[];
  /** Elapsed calendar days since the preceding viewing day, not empty days. */
  gapDays: number | null;
};

/** One stop per viewing day. Stable across input order; repeat viewings stay in their day. */
export function buildWatchTimeline(watches: CalendarWatch[]): WatchTimelineDay[] {
  const grouped = new Map<string, CalendarWatch[]>();
  for (const watch of watches) {
    const entries = grouped.get(watch.watchedOn);
    if (entries) entries.push(watch);
    else grouped.set(watch.watchedOn, [watch]);
  }
  const dates = [...grouped.keys()].sort();
  return dates.map((iso, index) => ({
    iso,
    watches: grouped.get(iso)!.sort((a, b) => a.id - b.id),
    gapDays: index === 0 ? null : Math.round(
      (watchInstantFromISODate(iso).getTime() - watchInstantFromISODate(dates[index - 1]).getTime()) / 86_400_000,
    ),
  }));
}
