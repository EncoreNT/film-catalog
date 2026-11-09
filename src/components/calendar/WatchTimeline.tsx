"use client";

import { useEffect, useMemo, useRef, useState, type KeyboardEvent, type PointerEvent } from "react";
import { ChevronLeft, ChevronRight, Film, Star } from "lucide-react";
import { Button } from "@/components/primitives/Button";
import { HoverTooltip } from "@/components/primitives/HoverTooltip";
import { Modal } from "@/components/primitives/Modal";
import { formatRatingDisplay } from "@/lib/movies/movie-rating";
import { formatWatchCount, watchInstantFromISODate } from "@/lib/movies/movie-watch-date";
import { layoutWatchTimeline } from "@/lib/layout/watch-timeline-layout";
import { buildWatchTimeline } from "@/lib/movies/watch-timeline";
import { formatCountRu } from "@/lib/shared/russian-plural";
import type { CalendarWatch } from "@/lib/movies/watch-calendar";
import { MoviePreview, Poster, dayFormatter } from "./WatchMoviePreview";

const dateFormat = new Intl.DateTimeFormat("ru-RU", { day: "numeric", month: "long", timeZone: "UTC" });
const weekdayFormat = new Intl.DateTimeFormat("ru-RU", { weekday: "long", timeZone: "UTC" });

export function WatchTimeline({ watches }: { watches: CalendarWatch[] }) {
  const days = useMemo(() => buildWatchTimeline(watches), [watches]);
  const [activeIndex, setActiveIndex] = useState(() => Math.max(0, days.length - 1));
  const [instant, setInstant] = useState(true);
  const [selected, setSelected] = useState<CalendarWatch | null>(null);
  const gesture = useRef<{ x: number; y: number } | null>(null);
  const sceneRef = useRef<HTMLDivElement>(null);
  const measuredWidth = useRef(0);
  const [sceneSize, setSceneSize] = useState({ width: 0, height: 0 });
  const suppressClickUntil = useRef(0);
  const active = days[activeIndex];
  const previous = days[activeIndex - 1];
  const next = days[activeIndex + 1];
  const windowStart = Math.max(0, activeIndex - 3);
  const visibleDays = days.slice(windowStart, activeIndex + 4).map((day, position) => ({
    day, index: windowStart + position, offset: windowStart + position - activeIndex,
  }));

  const layout = layoutWatchTimeline(visibleDays.map(({ day }) => ({ count: day.watches.length, gapDays: day.gapDays })), activeIndex - windowStart, sceneSize.width || 1200, sceneSize.height || 650);

  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene) return;
    const observer = new ResizeObserver(([entry]) => {
      // A viewport resize is layout, not navigation; do not sweep the days across the screen.
      if (entry.contentRect.width !== measuredWidth.current) setInstant(true);
      measuredWidth.current = entry.contentRect.width;
      setSceneSize({ width: entry.contentRect.width, height: entry.contentRect.height });
    });
    observer.observe(scene);
    return () => observer.disconnect();
  }, [days.length]);

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

  return <section className="watch-timeline" data-instant={instant} data-ready={sceneSize.width > 0} aria-label="Лента просмотров" aria-roledescription="карусель" onKeyDown={onKeyDown}>
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
      {visibleDays.map(({ day, index, offset }, position) => {
        const distance = Math.abs(offset);
        const current = offset === 0;
        const panel = layout.panels[position];
        const dateLabel = dayFormatter.format(watchInstantFromISODate(day.iso));
        return <article key={day.iso} className="watch-timeline-day" data-current={current} data-offset={offset} data-date={day.iso}
          aria-label={dateLabel} aria-hidden={distance > 2 ? true : undefined} inert={distance > 2 ? true : undefined}
          style={{
            width: panel.width,
            transform: `translate(-50%, -50%) translateX(${panel.x}px) perspective(1400px) translateZ(${-panel.depth}px) rotateY(${panel.angle}deg)`,
            opacity: distance === 0 ? 1 : distance === 1 ? .7 : distance === 2 ? .45 : .15,
            zIndex: 4 - distance,
          }}>
          <div className="watch-timeline-cards scroll-subtle" style={{ gap: layout.cardGap }} data-overflow={day.watches.length > 2 && current}
            tabIndex={day.watches.length > 2 && current ? 0 : undefined}
            aria-label={day.watches.length > 2 && current ? "Фильмы дня, прокручиваемая область" : undefined}>
            {(current ? day.watches : day.watches.slice(0, 2)).map((watch, movieIndex) => <figure className="watch-timeline-card" key={watch.id} style={{ width: layout.cardWidth }}>
              <HoverTooltip className="watch-timeline-cover" disabled={!current || selected != null} content={<MoviePreview watch={watch} compact />}>
                <button type="button" className="watch-timeline-poster focus-ring" tabIndex={distance > 2 || (!current && movieIndex > 0) ? -1 : 0}
                  aria-label={current ? `${watch.movie.title}, ${watch.movie.rating == null ? "без оценки" : `оценка ${formatRatingDisplay(watch.movie.rating)} из 10`}` : `Перейти к просмотрам: ${dateLabel}`}
                  onClick={(event) => current ? setSelected(watch) : select(index, event.detail === 0)}>
                  <Poster movie={watch.movie} sizes="(max-width: 767px) 42vw, 320px" eager={distance <= 2} />
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
      {visibleDays.map(({ day, offset }, position) => {
        const preceding = layout.panels[position - 1];
        if (!preceding || day.gapDays == null) return null;
        const visible = offset >= -1 && offset <= 2;
        const length = layout.panels[position].gapBefore - 16;
        const label = formatCountRu(day.gapDays, ["день", "дня", "дней"]);
        const halfLabel = `${label.length / 2}ch + 6px`;
        return <div key={`gap-${day.iso}`} className="watch-timeline-bridge" role="img" aria-hidden={!visible}
          aria-label={`${formatCountRu(day.gapDays, ["день", "дня", "дней"])} между просмотрами ${dateFormat.format(watchInstantFromISODate(visibleDays[position - 1].day.iso))} и ${dateFormat.format(watchInstantFromISODate(day.iso))}`}
          style={{ transform: `translate(${preceding.right + 8}px, -50%)`, opacity: visible ? 1 : 0 }}>
          <span className="watch-timeline-bridge-line" aria-hidden style={{ clipPath: `inset(0 max(0px, calc(100% - ${length / 2}px + ${halfLabel})) 0 0)` }} />
          <span className="watch-timeline-bridge-line" aria-hidden style={{ clipPath: `inset(0 max(0px, calc(100% - ${length}px)) 0 max(0px, calc(${length / 2}px + ${halfLabel})))` }} />
          <span className="watch-timeline-bridge-label" style={{ transform: `translateX(${length / 2}px) translate(-50%, -50%)` }}>{label}</span>
        </div>;
      })}
    </div>

    <div className="watch-timeline-thread" aria-label="Жанры текущего и соседних дней">
      <div className="watch-timeline-wire" aria-hidden />
      <div className="watch-timeline-genre-cloud">
        {visibleDays.map(({ day, index, offset }, position) => {
          const counts = new Map<string, number>();
          for (const watch of day.watches) for (const genre of new Set(watch.movie.genres)) counts.set(genre, (counts.get(genre) ?? 0) + 1);
          const genres = [...counts].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "ru"));
          const panel = layout.panels[position];
          const centre = (panel.left + panel.right) / 2;
          const leftPanel = layout.panels[position - 1];
          const rightPanel = layout.panels[position + 1];
          const spacing = Math.min(leftPanel ? centre - (leftPanel.left + leftPanel.right) / 2 : Infinity,
            rightPanel ? (rightPanel.left + rightPanel.right) / 2 - centre : Infinity);
          const mobile = sceneSize.width < 768;
          const cloudWidth = mobile ? sceneSize.width * .7 : Math.max(100, Math.min(500, spacing - 28));
          const preview = offset !== 0;
          const shownGenres = preview ? genres.slice(0, 3) : genres;
          const distance = Math.abs(offset);
          const cloudCentre = mobile ? offset * sceneSize.width * .8 : centre;
          const hidden = distance > 2 || Math.abs(cloudCentre) - cloudWidth / 2 >= sceneSize.width / 2;
          return <div key={day.iso} className="watch-timeline-genres" data-current={!preview} data-date={day.iso}
            aria-hidden={hidden} inert={hidden ? true : undefined}
            style={{ width: cloudWidth, opacity: distance === 0 ? 1 : distance === 1 ? .7 : distance === 2 ? .55 : 0,
              transform: `translateX(${cloudCentre}px)` }}>
            {preview && !hidden && <button type="button" className="watch-timeline-genre-jump focus-ring"
              aria-label={`Жанры и просмотры: ${dayFormatter.format(watchInstantFromISODate(day.iso))}`}
              onClick={event => select(index, event.detail === 0)} />}
            {genres.length ? shownGenres.map(([genre, count]) => <span key={genre} className="watch-timeline-genre" data-shared={count > 1}
              title={count > 1 ? `${genre} — ${formatCountRu(count, ["фильм", "фильма", "фильмов"])}` : undefined}><span className="watch-timeline-genre-dot" aria-hidden />{genre}</span>)
              : <span className="watch-timeline-genre-empty">Жанры пока не указаны</span>}
            {preview && genres.length > shownGenres.length && <span className="watch-timeline-genre-more">+{genres.length - shownGenres.length}</span>}
          </div>;
        })}
      </div>
      <p className="watch-timeline-genre-label">Жанры просмотров</p>
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
