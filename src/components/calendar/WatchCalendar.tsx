"use client";

import { useEffect, useState, useSyncExternalStore, useTransition, type CSSProperties } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowUpRight, CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
import { Poster, MoviePreview, dayFormatter } from "./WatchMoviePreview";
import { WatchCalendarYear } from "./WatchCalendarYear";
import { Button } from "@/components/primitives/Button";
import { HoverTooltip } from "@/components/primitives/HoverTooltip";
import { Modal } from "@/components/primitives/Modal";
import { formatRatingDisplay } from "@/lib/movies/movie-rating";
import { formatWatchCount, watchInstantFromISODate } from "@/lib/movies/movie-watch-date";
import { WEEKDAYS_SHORT_RU, toISODate } from "@/lib/shared/calendar";
import {
  buildWatchCalendar, shiftWatchCalendar, watchCalendarHref, watchCalendarLabel,
  WATCH_CALENDAR_MODES, WATCH_CALENDAR_VIEWS, RECENT_PERIOD_LABELS,
  type CalendarWatch, type WatchCalendarView, type WatchCalendarMode,
} from "@/lib/movies/watch-calendar";

const shortDayFormatter = new Intl.DateTimeFormat("ru-RU", { day: "numeric", month: "short", timeZone: "UTC" });

function subscribeToLocalDay(onChange: () => void) {
  const timer = window.setInterval(onChange, 60_000);
  window.addEventListener("focus", onChange);
  return () => { window.clearInterval(timer); window.removeEventListener("focus", onChange); };
}
const localDaySnapshot = () => toISODate(new Date());

export function WatchCalendar({ date, view, mode, today: serverToday, useLocalToday, watches }: {
  date: string;
  view: WatchCalendarView;
  mode: WatchCalendarMode;
  today: string;
  useLocalToday: boolean;
  watches: CalendarWatch[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const today = useSyncExternalStore(subscribeToLocalDay, localDaySnapshot, () => serverToday);
  const [selected, setSelected] = useState<CalendarWatch | null>(null);
  const recent = mode === "recent";
  const range = buildWatchCalendar(date, view, mode);
  const label = watchCalendarLabel(date, view, mode);
  const byDay = new Map<string, CalendarWatch[]>();
  for (const watch of watches) byDay.set(watch.watchedOn, [...(byDay.get(watch.watchedOn) ?? []), watch]);
  const periodWatches = !recent && view === "month" ? watches.filter((watch) => watch.watchedOn.startsWith(date.slice(0, 7))) : watches;

  useEffect(() => {
    if ((recent || useLocalToday) && today !== serverToday) {
      router.replace(watchCalendarHref(today, view, mode, Intl.DateTimeFormat().resolvedOptions().timeZone), { scroll: false });
    }
  }, [router, serverToday, today, useLocalToday, view, mode, recent]);

  function navigate(nextDate: string, nextView = view, nextMode = mode) {
    startTransition(() => router.push(watchCalendarHref(nextDate, nextView, nextMode, Intl.DateTimeFormat().resolvedOptions().timeZone), { scroll: false }));
  }

  return (
    <section className="watch-calendar-page" aria-busy={pending}>
      <header className="watch-calendar-heading">
        <div><h1>Календарь просмотров</h1><p>Ваши фильмы, день за днём</p></div>
        <div className="watch-calendar-summary" aria-live="polite">
          <strong>{formatWatchCount(periodWatches.length)}</strong><span>за {recent ? `последние ${RECENT_PERIOD_LABELS[view]}` : view === "year" ? "год" : view === "month" ? "месяц" : view === "week" ? "неделю" : "две недели"}</span>
        </div>
      </header>

      <div className="watch-calendar-toolbar">
        <div className="watch-calendar-period">
          {!recent && <>
          <div className="watch-calendar-arrows">
            <Button variant="ghost" aria-label="Предыдущий период" disabled={pending || (view === "year" ? date.slice(0, 4) === "1000" : date <= "1000-02-01")} onClick={() => navigate(shiftWatchCalendar(date, view, -1))}><ChevronLeft size={18} aria-hidden /></Button>
            <Button variant="ghost" aria-label="Следующий период" disabled={pending || (view === "year" ? date.slice(0, 4) === "9998" : date >= "9998-11-01")} onClick={() => navigate(shiftWatchCalendar(date, view, 1))}><ChevronRight size={18} aria-hidden /></Button>
          </div>
          </>}
          <h2>{label}</h2>
          {!recent && <>
          <label className="watch-calendar-jump focus-within:outline-2 focus-within:outline-accent">
            <CalendarDays size={18} aria-hidden />
            <span className="sr-only">Перейти к дате</span>
            <input aria-label="Перейти к дате" type="date" min="1000-02-01" max="9998-11-01" value={date} disabled={pending}
              onChange={(event) => { const value = event.target.value; if (value >= "1000-02-01" && value <= "9998-11-01") navigate(value); }} />
          </label>
          <Button variant="ghost" disabled={pending} onClick={() => navigate(toISODate(new Date()))}>Сегодня</Button>
          </>}
        </div>
        <div className="watch-calendar-controls">
          <div className="watch-calendar-modes" role="group" aria-label="Режим календаря">
            {WATCH_CALENDAR_MODES.map((option) => <button key={option.value} type="button" className="focus-ring" aria-pressed={mode === option.value}
              disabled={pending} onClick={() => navigate(today, view, option.value)}>{option.label}</button>)}
          </div>
        <div className="watch-calendar-views" role="group" aria-label="Размер календаря">
          {WATCH_CALENDAR_VIEWS.map((option) => <button key={option.value} type="button" className="focus-ring" aria-pressed={view === option.value}
            disabled={pending} onClick={() => navigate(date, option.value)}>{recent ? RECENT_PERIOD_LABELS[option.value] : option.label}</button>)}
        </div>
        </div>
      </div>

      <div className="watch-calendar-board" data-view={view} data-mode={mode} data-pending={pending}>
        {view === "year" ? <WatchCalendarYear days={range.days} byDay={byDay} today={today} /> : <>
        {!recent && <div className="watch-calendar-weekdays" aria-hidden>{WEEKDAYS_SHORT_RU.map((day) => <span key={day}>{day}</span>)}</div>}
        <div className="watch-calendar-grid" style={{ "--calendar-rows": range.rows, "--calendar-columns": range.columns } as CSSProperties}>
          {range.days.map((day, index) => {
            if (!recent && view === "month" && !day.inMonth) {
              return <div key={day.iso} className="watch-calendar-gap" aria-hidden />;
            }
            const entries = byDay.get(day.iso) ?? [];
            return (
              <article key={day.iso} className="watch-calendar-day" data-today={day.iso === today} data-watched={entries.length > 0}
                style={{ "--poster-columns": Math.max(1, Math.min(entries.length, 3)) } as CSSProperties}
                aria-label={`${dayFormatter.format(watchInstantFromISODate(day.iso))}, ${formatWatchCount(entries.length)}`}>
                {entries.length === 0 && <span className="watch-day-watermark" aria-hidden>{day.day}</span>}
                <header>
                  <time className={!recent && view === "month" && entries.length === 0 ? "sr-only" : undefined} dateTime={day.iso} aria-current={day.iso === today ? "date" : undefined}>
                    {recent ? shortDayFormatter.format(watchInstantFromISODate(day.iso)) : day.day}
                    <span className="watch-day-weekday">{WEEKDAYS_SHORT_RU[recent ? (watchInstantFromISODate(day.iso).getUTCDay() + 6) % 7 : index % 7]}</span>
                  </time>
                </header>
                {entries.length > 0 && <div className="watch-day-posters scroll-subtle" tabIndex={0} aria-label="Постеры просмотров, прокручиваемая область">
                  {entries.map((watch) => <HoverTooltip key={watch.id} className="watch-poster-slot" disabled={selected != null} content={<MoviePreview watch={watch} compact />}>
                    <button type="button" className="watch-poster focus-ring" onClick={() => setSelected(watch)}
                      aria-label={`${watch.movie.title}, ${watch.movie.rating == null ? "без оценки" : `оценка ${formatRatingDisplay(watch.movie.rating)} из 10`}`}>
                      <Poster movie={watch.movie} />
                    </button>
                  </HoverTooltip>)}
                </div>}
              </article>
            );
          })}
        </div>
        </>}
      </div>
      <footer className="watch-calendar-footer" role="status">
        {pending ? "Загружаем просмотры…" : periodWatches.length === 0
          ? "В этом периоде нет просмотров. Добавьте дату просмотра на странице фильма."
          : "Выберите постер, чтобы узнать больше о фильме."}
        {periodWatches.length === 0 && <Link href="/" className="focus-ring">В каталог <ArrowUpRight size={14} aria-hidden /></Link>}
      </footer>
      <Modal open={selected != null} onClose={() => setSelected(null)} title={selected?.movie.title.split(" / ")[0] ?? "Фильм"}>
        {selected && <MoviePreview watch={selected} />}
      </Modal>
    </section>
  );
}
