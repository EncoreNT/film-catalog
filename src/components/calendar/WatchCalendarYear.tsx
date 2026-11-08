"use client";

import { useState } from "react";
import { HoverTooltip } from "@/components/primitives/HoverTooltip";
import { Modal } from "@/components/primitives/Modal";
import { WEEKDAYS_SHORT_RU } from "@/lib/shared/calendar";
import { watchInstantFromISODate } from "@/lib/movies/movie-watch-date";
import { groupWatchCalendarMonths, type buildWatchCalendar, type CalendarWatch } from "@/lib/movies/watch-calendar";
import { Poster, MoviePreview, dayFormatter } from "./WatchMoviePreview";

const monthFormatter = new Intl.DateTimeFormat("ru-RU", { month: "long", timeZone: "UTC" });

export function WatchCalendarYear({ days, byDay, today }: {
  days: ReturnType<typeof buildWatchCalendar>["days"];
  byDay: Map<string, CalendarWatch[]>;
  today: string;
}) {
  const [selected, setSelected] = useState<CalendarWatch[] | null>(null);
  return <>
    <div className="watch-year-grid">
      {groupWatchCalendarMonths(days).map((month) => <section className="watch-year-month" key={month.iso} aria-labelledby={`month-${month.iso}`}>
        <h3 id={`month-${month.iso}`}>
          {monthFormatter.format(watchInstantFromISODate(`${month.iso}-01`))}
          <span>{month.iso.slice(0, 4)}</span>
        </h3>
        <div className="watch-year-weekdays" aria-hidden>{WEEKDAYS_SHORT_RU.map((day) => <span key={day}>{day}</span>)}</div>
        <div className="watch-year-days">
          {month.days.map((day, index) => {
            if (!day) return <span key={`gap-${index}`} aria-hidden />;
            const entries = byDay.get(day.iso) ?? [];
            const dateLabel = dayFormatter.format(watchInstantFromISODate(day.iso));
            return <div key={day.iso} className="watch-year-day" data-date={day.iso} data-today={day.iso === today} data-watched={entries.length > 0}>
              {entries.length === 0
                ? <time className="watch-year-date" dateTime={day.iso} aria-label={dateLabel} aria-current={day.iso === today ? "date" : undefined}>{day.day}</time>
                : <HoverTooltip className="watch-year-avatar-slot" disabled={selected != null} interactive
                    content={<div className="watch-year-previews scroll-subtle">{entries.map((watch) => <MoviePreview key={watch.id} watch={watch} compact />)}</div>}>
                    <button type="button" className="watch-year-avatar focus-ring" onClick={() => setSelected(entries)}
                      aria-current={day.iso === today ? "date" : undefined}
                      aria-label={`${dateLabel}: ${entries.map((watch) => watch.movie.title).join(", ")}`}>
                      {entries.slice(0, 2).map((watch) => <span className="watch-year-avatar-image" key={watch.id}><Poster movie={watch.movie} /></span>)}
                    </button>
                  </HoverTooltip>}
            </div>;
          })}
        </div>
      </section>)}
    </div>
    <Modal open={selected != null} onClose={() => setSelected(null)} title={selected ? dayFormatter.format(watchInstantFromISODate(selected[0].watchedOn)) : "Просмотры"}>
      <div className="watch-year-selected">
        {selected?.map((watch) => <section key={watch.id}>
          <h3>{watch.movie.title.split(" / ")[0]}</h3>
          <MoviePreview watch={watch} />
        </section>)}
      </div>
    </Modal>
  </>;
}
