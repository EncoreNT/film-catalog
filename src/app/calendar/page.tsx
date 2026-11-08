import type { Metadata } from "next";
import { WatchCalendar } from "@/components/calendar/WatchCalendar";
import { buildWatchCalendar, parseWatchCalendarQuery, watchCalendarToday } from "@/lib/movies/watch-calendar";
import { getCalendarWatches } from "@/lib/movies/watch-calendar-query";
import "@/components/calendar/watch-calendar.css";

export const metadata: Metadata = { title: "Календарь просмотров" };

export default async function CalendarPage({ searchParams }: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const query = await searchParams;
  const today = watchCalendarToday(typeof query.timeZone === "string" ? query.timeZone : undefined);
  const { date, view, mode } = parseWatchCalendarQuery(query, today);
  const range = buildWatchCalendar(date, view, mode);
  const watches = await getCalendarWatches(range.start, range.endExclusive);
  return <WatchCalendar key={`${date}:${view}:${mode}`} date={date} view={view} mode={mode} today={today}
    useLocalToday={query.date == null} watches={watches} />;
}
