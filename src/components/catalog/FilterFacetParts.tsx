"use client";

import {
  ArrowDownAZ,
  ArrowDownWideNarrow,
} from "lucide-react";
import { AUDIO_TRANSLATION_TYPES } from "@/lib/shared/dictionaries";
import type { GenreSortMode } from "@/lib/catalog/genre-facet-sort";

export const SEGMENT_SHELL =
  "inline-flex flex-wrap rounded-full border border-border bg-bg-elevated/50 backdrop-blur-md";

export const HDR_OPTIONS = [
  { value: "HDR10", label: "HDR10" },
  { value: "HDR10+", label: "HDR10+" },
  { value: "DolbyVision", label: "Dolby Vision" },
  { value: "HLG", label: "HLG" },
] as const;
export const HDR_ANY = "HDR_ANY";

export const translationLabel = (value: string) =>
  AUDIO_TRANSLATION_TYPES.find((t) => t.value === value)?.label ?? value;

export function GenreSortToggle({
  value,
  onChange,
}: {
  value: GenreSortMode;
  onChange: (mode: GenreSortMode) => void;
}) {
  return (
    <div
      className={`${SEGMENT_SHELL} p-0.5`}
      role="group"
      aria-label="Сортировка жанров"
    >
      {(
        [
          ["alpha", "А-Я", ArrowDownAZ],
          ["count", "по числу", ArrowDownWideNarrow],
        ] as const
      ).map(([mode, text, Icon]) => {
        const active = value === mode;
        return (
          <button
            key={mode}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(mode)}
            className={`focus-ring inline-flex min-h-7 items-center gap-1 rounded-full px-2 py-0.5 font-mono-tech transition-colors ${
              active
                ? "bg-accent/15 text-accent ring-1 ring-inset ring-accent/40"
                : "text-muted hover:bg-bg-surface hover:text-text"
            }`}
          >
            <Icon className="h-3 w-3" aria-hidden />
            {text}
          </button>
        );
      })}
    </div>
  );
}

export function FacetSection({
  index,
  icon,
  title,
  hint,
  headerActions,
  children,
}: {
  index: string;
  icon: React.ReactNode;
  title: string;
  hint?: string;
  headerActions?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-2.5">
      <div className="flex items-center gap-2">
        <span className="font-mono text-[0.6rem] uppercase tracking-wider text-faint/70 tabular-nums">
          {index}
        </span>
        <span className="text-accent/80" aria-hidden>
          {icon}
        </span>
        <h3 className="font-mono-tech text-faint">{title}</h3>
        {headerActions || hint ? (
          <div className="ml-auto flex flex-wrap items-center justify-end gap-2">
            {headerActions}
            {hint ? (
              <span className="font-micro text-faint/60">{hint}</span>
            ) : null}
          </div>
        ) : null}
      </div>
      {children}
    </section>
  );
}

export function QualityLadder({
  options,
  active,
  counts,
  onToggle,
}: {
  options: { value: string; label: string }[];
  active: string[];
  counts: Map<string, number>;
  onToggle: (value: string) => void;
}) {
  if (options.length === 0) return null;
  return (
    <div className={`${SEGMENT_SHELL} p-0.5`}>
      {options.map((opt, i) => {
        const on = active.includes(opt.value);
        const count = counts.get(opt.value);
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onToggle(opt.value)}
            aria-pressed={on}
            className={`focus-ring inline-flex min-h-8 items-center gap-1.5 rounded-full px-2.5 py-1 text-[0.7rem] transition-all duration-200 active:scale-[0.97] ${
              i > 0 ? "ml-0.5" : ""
            } ${
              on
                ? "bg-accent/15 text-accent ring-1 ring-inset ring-accent/40"
                : "text-muted hover:bg-bg-surface hover:text-text"
            }`}
          >
            <span className={on ? "text-accent" : "text-text/90"}>
              {opt.label}
            </span>
            {count != null ? (
              <span
                className={`tabular-nums text-[0.58rem] ${
                  on ? "text-accent/70" : "text-faint"
                }`}
              >
                {count}
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}

export function Divider() {
  return (
    <div className="h-px bg-gradient-to-r from-transparent via-border to-transparent" />
  );
}
