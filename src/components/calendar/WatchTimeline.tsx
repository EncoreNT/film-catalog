"use client";

import { useMemo, useRef, useState, type KeyboardEvent, type PointerEvent } from "react";
import { ChevronLeft, ChevronRight, Film, Star } from "lucide-react";
import { Button } from "@/components/primitives/Button";
import { HoverTooltip } from "@/components/primitives/HoverTooltip";
import { Modal } from "@/components/primitives/Modal";
import { formatRatingDisplay } from "@/lib/movies/movie-rating";
import { formatWatchCount, watchInstantFromISODate } from "@/lib/movies/movie-watch-date";
import { buildWatchTimeline } from "@/lib/movies/watch-timeline";
import { formatCountRu } from "@/lib/shared/russian-plural";
import type { CalendarWatch } from "@/lib/movies/watch-calendar";
import { MoviePreview, Poster, dayFormatter } from "./WatchMoviePreview";

const dateFormat = new Intl.DateTimeFormat("ru-RU", { day: "numeric", month: "long", timeZone: "UTC" });
const weekdayFormat = new Intl.DateTimeFormat("ru-RU", { weekday: "long", timeZone: "UTC" });

export function WatchTimeline({ watches }: { watches: CalendarWatch[] }) {
  const days = useMemo(() => buildWatchTimeline(watches), [watches]);
  const [activeIndex, setActiveIndex] = useState(() => Math.max(0, days.length - 1));
  const [instant, setInstant] = useState(false);
  const [selected, setSelected] = useState<CalendarWatch | null>(null);
  const gesture = useRef<{ x: number; y: number } | null>(null);
  const sceneRef = useRef<HTMLDivElement>(null);
  const suppressClickUntil = useRef(0);
  const active = days[activeIndex];
  const previous = days[activeIndex - 1];
  const next = days[activeIndex + 1];
  const windowStart = Math.max(0, activeIndex - 3);
  const visibleDays = days.slice(windowStart, activeIndex + 4).map((day, position) => ({
    day, index: windowStart + position, offset: windowStart + position - activeIndex,
  }));

  function select(index: number, immediately = false) {
    setInstant(immediately);
    setActiveIndex(Math.max(0, Math.min(days.length - 1, index)));
  }

  function onKeyDown(event: KeyboardEvent<HTMLElement>) {
    if (selected || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
    if ((event.target as HTMLElement).closest("input, textarea, select, [contenteditable=true]")) return;
    const target = { ArrowLeft: activeIndex - 1, ArrowRight: activeIndex + 1, Home: 0, End: days.length - 1 }[event.key];
    if (target == null) return;
    event.preventDefault();
    select(target, true);
    sceneRef.current?.focus({ preventScroll: true });
  }

  function onPointerDown(event: PointerEvent<HTMLDivElement>) {
    if (event.pointerType === "mouse" || !event.isPrimary || (event.target as HTMLElement).closest("[data-overflow=true]")) return;
    gesture.current = { x: event.clientX, y: event.clientY };
  }

  function onPointerUp(event: PointerEvent<HTMLDivElement>) {
    const start = gesture.current;
    gesture.current = null;
    if (!start) return;
    const dx = event.clientX - start.x;
    const dy = event.clientY - start.y;
    if (Math.abs(dx) < 45 || Math.abs(dx) < Math.abs(dy) * 1.5) return;
    suppressClickUntil.current = Date.now() + 350;
    select(activeIndex + (dx < 0 ? 1 : -1));
  }

  if (!active) return <div className="watch-timeline-empty">
    <Film size={42} strokeWidth={1} aria-hidden />
    <h2>История просмотров пока пуста</h2>
    <p>Добавьте дату просмотра на странице фильма.</p>
  </div>;

  return <section className="watch-timeline" data-instant={instant} aria-label="Лента просмотров" aria-roledescription="карусель" onKeyDown={onKeyDown}>
    <header className="watch-timeline-date">
      {visibleDays.map(({ day, offset }) => <div key={day.iso} className="watch-timeline-date-slide" data-date={day.iso} aria-hidden={offset !== 0}
        style={{ transform: `translateY(${Math.max(-2, Math.min(2, offset)) * 105}%) rotateX(${-Math.sign(offset) * 25}deg)`, opacity: offset === 0 ? 1 : 0 }}>
        <p>{weekdayFormat.format(watchInstantFromISODate(day.iso))}, {day.iso.slice(0, 4)}</p>
        <h2><time dateTime={day.iso}>{dateFormat.format(watchInstantFromISODate(day.iso))}</time></h2>
      </div>)}
      <span className="sr-only" aria-live="polite" aria-atomic="true">{dayFormatter.format(watchInstantFromISODate(active.iso))}, {formatWatchCount(active.watches.length)}. День {activeIndex + 1} из {days.length}.</span>
    </header>

    <div ref={sceneRef} className="watch-timeline-scene focus-ring" tabIndex={0} aria-label="Дни просмотров. Стрелки влево и вправо переключают день."
      onPointerDown={onPointerDown} onPointerUp={onPointerUp} onPointerCancel={() => { gesture.current = null; }}
      onClickCapture={(event) => { if (Date.now() < suppressClickUntil.current) { event.preventDefault(); event.stopPropagation(); } }}>
      {visibleDays.map(({ day, index, offset }) => {
        const distance = Math.abs(offset);
        const current = offset === 0;
        const x = offset === 0 ? 0 : Math.sign(offset) * (37 + (distance - 1) * 28);
        const dateLabel = dayFormatter.format(watchInstantFromISODate(day.iso));
        return <article key={day.iso} className="watch-timeline-day" data-current={current} data-offset={offset} data-date={day.iso}
          aria-label={dateLabel} aria-hidden={distance > 1 ? true : undefined} inert={distance > 1 ? true : undefined}
          style={{
            transform: `translate(-50%, -50%) translateX(${x}cqw) translateZ(${-distance * 230}px) rotateY(${-Math.sign(offset) * Math.min(distance, 2) * 26}deg)`,
            opacity: distance === 0 ? 1 : distance === 1 ? .6 : distance === 2 ? .2 : 0,
            zIndex: 4 - distance,
          }}>
          <div className="watch-timeline-cards scroll-subtle" data-overflow={day.watches.length > 2 && current}
            tabIndex={day.watches.length > 2 && current ? 0 : undefined}
            aria-label={day.watches.length > 2 && current ? "Фильмы дня, прокручиваемая область" : undefined}>
            {(current ? day.watches : day.watches.slice(0, 2)).map((watch, movieIndex) => <figure className="watch-timeline-card" key={watch.id}>
              <HoverTooltip className="watch-timeline-cover" disabled={!current || selected != null} content={<MoviePreview watch={watch} compact />}>
                <button type="button" className="watch-timeline-poster focus-ring" tabIndex={distance > 1 || (!current && movieIndex > 0) ? -1 : 0}
                  aria-label={current ? `${watch.movie.title}, ${watch.movie.rating == null ? "без оценки" : `оценка ${formatRatingDisplay(watch.movie.rating)} из 10`}` : `Перейти к просмотрам: ${dateLabel}`}
                  onClick={(event) => current ? setSelected(watch) : select(index, event.detail === 0)}>
                  <Poster movie={watch.movie} sizes="(max-width: 767px) 42vw, 320px" eager={distance <= 1} />
                  <span className="watch-timeline-poster-edge" aria-hidden />
                </button>
              </HoverTooltip>
              <figcaption aria-hidden={!current}>
                <h3>{watch.movie.title.split(" / ")[0]}</h3>
                <div><span>{watch.movie.year}</span><span className="watch-timeline-rating"><Star size={13} aria-hidden />{watch.movie.rating == null ? "Без оценки" : formatRatingDisplay(watch.movie.rating)}</span></div>
              </figcaption>
            </figure>)}
          </div>
        </article>;
      })}
    </div>

    <div className="watch-timeline-thread" aria-label="Интервалы между днями просмотров">
      <div className="watch-timeline-wire" aria-hidden />
      {visibleDays.map(({ day, index, offset }) => <div key={day.iso} className="watch-timeline-rail-day" data-date={day.iso} data-current={offset === 0}
        aria-hidden={Math.abs(offset) > 1} inert={Math.abs(offset) > 1 ? true : undefined}
        style={{ transform: `translateX(${offset * 50 - 50}%)` }}>
        <button type="button" className="watch-timeline-stop focus-ring" tabIndex={Math.abs(offset) > 1 ? -1 : 0}
          style={{ opacity: Math.abs(offset) <= 1 ? 1 : 0 }} aria-current={offset === 0 ? "step" : undefined}
          onClick={(event) => select(index, event.detail === 0)} aria-label={`Просмотры: ${dayFormatter.format(watchInstantFromISODate(day.iso))}`}>
          <span className="watch-timeline-dot" aria-hidden />
          <time dateTime={day.iso}>{dateFormat.format(watchInstantFromISODate(day.iso))}</time>
        </button>
        {day.gapDays != null && <span className="watch-timeline-gap" aria-hidden={offset < 0 || offset > 1}
          style={{ opacity: offset === 0 || offset === 1 ? 1 : 0 }}
          aria-label={`${formatCountRu(day.gapDays, ["день", "дня", "дней"])} между просмотрами`}>
          {formatCountRu(day.gapDays, ["день", "дня", "дней"])}
        </span>}
      </div>)}
      <span className="watch-timeline-end watch-timeline-end--first" aria-hidden={!!previous} style={{ opacity: previous ? 0 : 1 }}>Первый просмотр</span>
      <span className="watch-timeline-end watch-timeline-end--last" aria-hidden={!!next} style={{ opacity: next ? 0 : 1 }}>Последний просмотр</span>
    </div>

    <nav className="watch-timeline-nav" aria-label="Навигация по дням просмотров">
      <Button variant="ghost" disabled={!previous} aria-label="Раньше: предыдущий день просмотра" onClick={(event) => select(activeIndex - 1, event.detail === 0)}><ChevronLeft size={18} aria-hidden />Раньше</Button>
      <button className="watch-timeline-latest focus-ring" type="button" disabled={!next} onClick={(event) => select(days.length - 1, event.detail === 0)}>К последнему</button>
      <Button variant="ghost" disabled={!next} aria-label="Позже: следующий день просмотра" onClick={(event) => select(activeIndex + 1, event.detail === 0)}>Позже<ChevronRight size={18} aria-hidden /></Button>
    </nav>
    <Modal open={selected != null} onClose={() => setSelected(null)} title={selected?.movie.title.split(" / ")[0] ?? "Фильм"}>
      {selected && <MoviePreview watch={selected} />}
    </Modal>
  </section>;
}
