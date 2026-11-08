import type { Metadata } from "next";
import { WatchCalendar } from "@/components/calendar/WatchCalendar";
import { buildWatchCalendar, parseWatchCalendarQuery, parseWatchCalendarLayout, watchCalendarToday } from "@/lib/movies/watch-calendar";
import { getCalendarWatches } from "@/lib/movies/watch-calendar-query";
import "@/components/calendar/watch-calendar.css";
import "@/components/calendar/watch-timeline.css";

export const metadata: Metadata = { title: "Календарь просмотров" };

export default async function CalendarPage({ searchParams }: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const query = await searchParams;
  const today = watchCalendarToday(typeof query.timeZone === "string" ? query.timeZone : undefined);
  const { date, view, mode } = parseWatchCalendarQuery(query, today);
  const layout = parseWatchCalendarLayout(query.layout);
  // Timeline always spans the journal, including when opened from a dated calendar bookmark.
  const range = layout === "timeline" ? undefined : buildWatchCalendar(date, view, mode);
  const watches = await getCalendarWatches(range);
  return <WatchCalendar key={`${date}:${view}:${mode}:${layout}`} date={date} view={view} mode={mode} layout={layout} today={today}
    useLocalToday={query.date == null} watches={watches} />;
}
