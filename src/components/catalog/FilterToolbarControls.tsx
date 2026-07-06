"use client";

import { useState } from "react";
import { Eye, EyeOff, Layers2, ListVideo, Star } from "lucide-react";
import { SEGMENT_SHELL } from "@/components/catalog/FilterFacetParts";
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
    description: "Только фильмы с отметкой о просмотре",
  },
  {
    value: "unwatched" as const,
    icon: EyeOff,
    label: "Непросмотренные",
    description: "Фильмы без даты просмотра",
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
  `focus-ring inline-flex min-h-8 min-w-8 items-center justify-center rounded-[calc(var(--radius-sm)-2px)] transition-colors ${
    active
      ? "bg-accent/15 text-accent ring-1 ring-inset ring-accent/40"
      : "text-muted hover:bg-bg-surface hover:text-text"
  }`;

interface WatchedFilterProps {
  value: WatchedFilterValue;
  onChange: (value: WatchedFilterValue) => void;
}

export function WatchedFilter({ value, onChange }: WatchedFilterProps) {
  return (
    <div
      className={`${SEGMENT_SHELL} p-0.5`}
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
  description: "Показать только фильмы с двумя и более версиями файла",
};

interface MinRatingFilterProps {
  value: number | null;
  onChange: (value: number | null) => void;
  max?: number;
}

const MIN_RATING_TOOLTIP = {
  label: "Минимальная оценка",
  description:
    "Наведите, чтобы раскрыть звёзды, и выберите порог — покажутся фильмы с оценкой не ниже выбранной. Клик по уже горящей звезде сбрасывает фильтр.",
};

export function parseMinRating(raw: string | null): number | null {
  if (!raw) return null;
  const parsed = parseInt(raw, 10);
  if (!Number.isFinite(parsed) || parsed < 1 || parsed > 10) return null;
  return parsed;
}

export function MinRatingFilter({
  value,
  onChange,
  max = 10,
}: MinRatingFilterProps) {
  const [hover, setHover] = useState<number | null>(null);
  const active = value != null;
  const preview = hover;
  const display = preview ?? value;

  return (
    <div
      className={`${SEGMENT_SHELL} group inline-flex items-center p-0.5 transition-shadow duration-200 ${
        active ? "shadow-[0_0_16px_var(--accent-glow)]" : ""
      }`}
      role="group"
      aria-label={MIN_RATING_TOOLTIP.label}
      onMouseLeave={() => setHover(null)}
    >
      {/* Раскрывающийся звёздный ряд: 0 ширины в покое, полный при hover/focus-within */}
      <div className="grid grid-cols-[0fr] opacity-0 transition-[grid-template-columns,opacity] duration-200 ease-out group-hover:grid-cols-[1fr] group-hover:opacity-100 group-focus-within:grid-cols-[1fr] group-focus-within:opacity-100">
        <div className="flex items-center gap-0.5 overflow-hidden">
          {Array.from({ length: max }, (_, i) => {
            const rating = i + 1;
            const filled = display != null && rating <= display;
            const isSelected = active && value === rating;
            return (
              <button
                key={rating}
                type="button"
                onMouseEnter={() => setHover(rating)}
                onFocus={() => setHover(rating)}
                onBlur={() => setHover(null)}
                onClick={() => onChange(value === rating ? null : rating)}
                aria-label={
                  isSelected
                    ? `Минимальная оценка ${rating}+. Нажмите, чтобы сбросить`
                    : `Показывать фильмы с оценкой ${rating} и выше`
                }
                aria-pressed={isSelected}
                className="focus-ring inline-flex min-h-8 min-w-7 items-center justify-center rounded-[calc(var(--radius-sm)-2px)] text-muted transition-colors hover:text-accent"
              >
                <Star
                  className={`h-3.5 w-3.5 transition-colors duration-150 ${
                    filled
                      ? preview != null
                        ? "fill-accent/70 text-accent/70"
                        : "fill-accent text-accent"
                      : "fill-transparent text-muted/40"
                  }`}
                  aria-hidden
                />
              </button>
            );
          })}
        </div>
      </div>
      {/* Компактный индикатор — всегда виден, фиксированная ширина */}
      <button
        type="button"
        onClick={() => {
          if (active) onChange(null);
        }}
        aria-label={
          active
            ? `Минимальная оценка ${value}+. Нажмите, чтобы сбросить`
            : MIN_RATING_TOOLTIP.label
        }
        aria-pressed={active}
        className={`focus-ring inline-flex min-h-8 items-center justify-center gap-1 rounded-[calc(var(--radius-sm)-2px)] px-2 text-xs transition-colors ${
          active
            ? "text-accent"
            : "text-muted hover:bg-bg-surface hover:text-text"
        }`}
      >
        <Star
          className={`h-3.5 w-3.5 shrink-0 transition-colors duration-150 ${
            display != null
              ? preview != null
                ? "fill-accent/70 text-accent/70"
                : "fill-accent text-accent"
              : "fill-transparent text-muted/40"
          }`}
          aria-hidden
        />
        <span
          className="font-mono-tech inline-block w-8 text-center tabular-nums"
          aria-live="polite"
        >
          {display != null ? `${display}+` : "мин."}
        </span>
      </button>
    </div>
  );
}

export function MultiReleaseFilter({
  active,
  onChange,
}: MultiReleaseFilterProps) {
  return (
    <div className={`${SEGMENT_SHELL} p-0.5`}>
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
