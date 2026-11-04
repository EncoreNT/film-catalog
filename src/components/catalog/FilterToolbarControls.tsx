"use client";

import { useEffect, useRef, useState } from "react";
import { CircleOff, Eye, EyeOff, Layers2, ListVideo, MonitorPlay, Star } from "lucide-react";
import { HoverTooltip } from "@/components/primitives/HoverTooltip";

type WatchedFilterValue = "all" | "watched" | "unwatched";

export function parseWatchedFilter(raw: string | null): WatchedFilterValue {
  if (raw === "watched" || raw === "unwatched") return raw;
  return "all";
}

const WATCHED_OPTIONS = [
  {
    value: "all" as const,
    icon: ListVideo,
    label: "Все фильмы",
    description: "Без фильтра по просмотру",
  },
  {
    value: "watched" as const,
    icon: Eye,
    label: "Просмотренные",
    description: "Только фильмы с оценкой или датой просмотра",
  },
  {
    value: "unwatched" as const,
    icon: EyeOff,
    label: "Непросмотренные",
    description: "Без оценок и без даты просмотра",
  },
];

function FilterTooltipContent({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="max-w-52 px-3 py-2">
      <p className="text-xs font-medium text-text">{title}</p>
      <p className="mt-0.5 text-xs leading-snug text-muted">{description}</p>
    </div>
  );
}

const segmentButtonClass = (active: boolean) =>
  `catalog-icon focus-ring ${active ? "is-active" : ""}`;

interface WatchedFilterProps {
  value: WatchedFilterValue;
  onChange: (value: WatchedFilterValue) => void;
}

export function WatchedFilter({ value, onChange }: WatchedFilterProps) {
  return (
    <div
      className="catalog-tool-segment"
      role="group"
      aria-label="Просмотр"
    >
      {WATCHED_OPTIONS.map(({ value: optionValue, icon: Icon, label, description }) => {
        const active = value === optionValue;
        return (
          <HoverTooltip
            key={optionValue}
            className="inline-flex"
            content={
              <FilterTooltipContent title={label} description={description} />
            }
          >
            <button
              type="button"
              aria-label={label}
              aria-pressed={active}
              onClick={() => onChange(optionValue)}
              className={segmentButtonClass(active)}
            >
              <Icon className="h-4 w-4" aria-hidden />
            </button>
          </HoverTooltip>
        );
      })}
    </div>
  );
}

interface MultiReleaseFilterProps {
  active: boolean;
  onChange: (active: boolean) => void;
}

const MULTI_RELEASE_TOOLTIP = {
  label: "Несколько релизов",
  description:
    "Фильмы с двумя и более версиями файла (другое качество или источник). Многосерийный фильм, где у каждой серии один файл, сюда не попадает.",
};

interface MinRatingFilterProps {
  value: number | null;
  onChange: (value: number | null) => void;
  max?: number;
}

export function parseMinRating(raw: string | null): number | null {
  if (!raw) return null;
  const parsed = parseInt(raw, 10);
  if (!Number.isFinite(parsed) || parsed < 1 || parsed > 10) return null;
  return parsed;
}

export function MinRatingFilter({ value, onChange, max = 10 }: MinRatingFilterProps) {
  const [hover, setHover] = useState<number | null>(null);
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const display = hover ?? value;
  useEffect(() => {
    if (!open) return;
    const outside = (e: PointerEvent) => { if (!root.current?.contains(e.target as Node)) setOpen(false); };
    const escape = (e: KeyboardEvent) => { if (e.key === "Escape") { setOpen(false); trigger.current?.focus(); } };
    document.addEventListener("pointerdown", outside);
    document.addEventListener("keydown", escape);
    return () => { document.removeEventListener("pointerdown", outside); document.removeEventListener("keydown", escape); };
  }, [open]);
  return (
    <div className="catalog-rating-filter" ref={root} onMouseLeave={() => { setHover(null); setOpen(false); }} onBlur={(event) => { if (event.relatedTarget && !event.currentTarget.contains(event.relatedTarget as Node)) setOpen(false); }}>
      <button type="button" ref={trigger} className={`catalog-icon focus-ring ${value != null ? "is-active" : ""}`} onMouseEnter={() => setOpen(true)} onClick={() => setOpen(true)} aria-label={value != null ? `Минимальная оценка ${value}+` : "Минимальная оценка"} aria-expanded={open} aria-controls="catalog-rating-options">
        <Star className={value != null ? "fill-current" : ""} aria-hidden />{value != null ? <span>{value}+</span> : null}
      </button>
      {open ? <div id="catalog-rating-options" className="catalog-rating-options" role="group" aria-label="Минимальная оценка">
        <span className="text-xs text-muted">Оценка от {display ?? 1}</span>
        <div className="flex" onMouseLeave={() => setHover(null)}>
          {Array.from({ length: max }, (_, i) => i + 1).map((rating) => <button key={rating} type="button" className={`catalog-rating-star focus-ring ${display != null && rating <= display ? "is-active" : ""}`} aria-label={`Показывать фильмы с оценкой ${rating} и выше`} aria-pressed={value === rating} onMouseEnter={() => setHover(rating)} onFocus={() => setHover(rating)} onBlur={() => setHover(null)} onClick={() => onChange(value === rating ? null : rating)}><Star aria-hidden /><span>{rating}</span></button>)}
        </div>
        {value != null ? <button type="button" className="catalog-reset focus-ring" onClick={() => onChange(null)}>Сбросить оценку</button> : null}
      </div> : null}
    </div>
  );
}

export function TvReadyFilter({ active, onChange }: MultiReleaseFilterProps) {
  return <div className="catalog-tool-segment"><HoverTooltip content={<FilterTooltipContent title="Для телевизора" description="Релизы, совместимые с телевизором" />}><button type="button" className={segmentButtonClass(active)} aria-label="Для телевизора" aria-pressed={active} onClick={() => onChange(!active)}><MonitorPlay className="h-4 w-4" aria-hidden /></button></HoverTooltip></div>;
}

export function MultiReleaseFilter({
  active,
  onChange,
}: MultiReleaseFilterProps) {
  return (
    <div className="catalog-tool-segment">
      <HoverTooltip
        className="inline-flex"
        content={
          <FilterTooltipContent
            title={MULTI_RELEASE_TOOLTIP.label}
            description={MULTI_RELEASE_TOOLTIP.description}
          />
        }
      >
        <button
          type="button"
          aria-label={MULTI_RELEASE_TOOLTIP.label}
          aria-pressed={active}
          onClick={() => onChange(!active)}
          className={segmentButtonClass(active)}
        >
          <Layers2 className="h-4 w-4" aria-hidden />
        </button>
      </HoverTooltip>
    </div>
  );
}

interface EmptyReleasesFilterProps {
  active: boolean;
  count: number;
  onChange: (active: boolean) => void;
}

const EMPTY_RELEASES_TOOLTIP = {
  label: "Без релизов",
  description:
    "Карточки фильмов, к которым ещё не привязан файл. По умолчанию скрыты.",
};

export function EmptyReleasesFilter({
  active,
  count,
  onChange,
}: EmptyReleasesFilterProps) {
  if (count <= 0 && !active) return null;

  return (
    <div className="catalog-tool-segment">
      <HoverTooltip
        className="inline-flex"
        content={
          <FilterTooltipContent
            title={EMPTY_RELEASES_TOOLTIP.label}
            description={EMPTY_RELEASES_TOOLTIP.description}
          />
        }
      >
        <button
          type="button"
          aria-label={EMPTY_RELEASES_TOOLTIP.label}
          aria-pressed={active}
          onClick={() => onChange(!active)}
          className={segmentButtonClass(active)}
        >
          <span className="relative inline-flex">
            <CircleOff className="h-4 w-4" aria-hidden />
            {count > 0 ? (
              <span className="absolute -right-1.5 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-accent px-0.5 text-[0.55rem] font-medium tabular-nums text-bg-deep">
                {count}
              </span>
            ) : null}
          </span>
        </button>
      </HoverTooltip>
    </div>
  );
}
