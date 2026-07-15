"use client";

import { useEffect, useId, useMemo, useRef, useState, type ReactNode } from "react";
import { ChevronDown, Minus, Plus, X } from "lucide-react";
import { InfoHint } from "./InfoHint";

export const MIN_YEAR = 1888;
/** Latest accepted release year (allow upcoming releases). */
export const MAX_YEAR = new Date().getFullYear() + 1;

interface YearInputProps {
  /** Stored year (source of truth). */
  value: number | null;
  onChange: (year: number | null) => void;
  label?: string;
  hint?: ReactNode;
}

export function clampYear(n: number): number {
  return Math.min(MAX_YEAR, Math.max(MIN_YEAR, n));
}

/** Decade label like "202x" from a year. */
function decadeLabel(year: number): string {
  const base = Math.floor(year / 10) * 10;
  return `${base.toString().slice(0, 3)}x`;
}

interface Decade {
  /** Decade start year, e.g. 2020. */
  start: number;
  label: string;
  years: number[];
}

/** Build decades newest-first; each carries its in-range years. */
function buildDecades(): Decade[] {
  const decades: Decade[] = [];
  const maxDecade = Math.floor(MAX_YEAR / 10) * 10;
  for (let start = maxDecade; start >= MIN_YEAR; start -= 10) {
    const years: number[] = [];
    for (let y = start; y < start + 10 && y <= MAX_YEAR; y++) {
      if (y >= MIN_YEAR) years.push(y);
    }
    if (years.length === 0) continue;
    decades.push({ start, label: decadeLabel(start), years });
  }
  return decades;
}

export function YearInput({
  value,
  onChange,
  label = "Год",
  hint,
}: YearInputProps) {
  const fieldId = useId();
  const containerRef = useRef<HTMLDivElement>(null);
  const [text, setText] = useState(() => (value != null ? String(value) : ""));
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [expandedDecade, setExpandedDecade] = useState<number | null>(
    () => (value != null ? Math.floor(value / 10) * 10 : null),
  );

  const decades = useMemo(() => buildDecades(), []);

  const canDecrement = value == null || value > MIN_YEAR;
  const canIncrement = value == null || value < MAX_YEAR;

  const commit = (raw: string) => {
    const digits = raw.replace(/[^\d]/g, "").slice(0, 4);
    setText(digits);
    if (digits === "") {
      setError(null);
      onChange(null);
      return;
    }
    const n = parseInt(digits, 10);
    if (n < MIN_YEAR || n > MAX_YEAR) {
      setError(`Год должен быть от ${MIN_YEAR} до ${MAX_YEAR}.`);
      // Still emit the clamped value so submit can't store an out-of-range year,
      // but keep the user's text so they can fix it.
      onChange(clampYear(n));
      return;
    }
    setError(null);
    onChange(n);
  };

  const step = (delta: number) => {
    const base = value ?? new Date().getFullYear();
    const next = clampYear(base + delta);
    setText(String(next));
    setError(null);
    onChange(next);
  };

  const selectYear = (year: number) => {
    setText(String(year));
    setError(null);
    onChange(year);
    setOpen(false);
  };

  const clear = () => {
    setText("");
    setError(null);
    onChange(null);
    setOpen(false);
  };

  // Outside-click + Escape to close the dropdown.
  useEffect(() => {
    if (!open) return;
    const onMouse = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onMouse);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onMouse);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const hasValue = value != null;
  const activeDecadeStart =
    value != null ? Math.floor(value / 10) * 10 : null;
  // Effective expanded decade: a manual expansion wins, otherwise follow the
  // selected value so external value changes keep the right decade open.
  const effectiveDecade =
    expandedDecade ?? (value != null ? Math.floor(value / 10) * 10 : null);

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-1.5">
        <label
          htmlFor={fieldId}
          className="font-mono-tech text-[11px] uppercase tracking-[0.18em] text-muted"
        >
          {label}
        </label>
        {hint ? <InfoHint text={hint} label={label} /> : null}
      </div>
      <div className="relative" ref={containerRef}>
        <div
          className={`relative flex min-h-11 items-center gap-1 rounded-[var(--radius-sm)] border bg-bg-elevated/70 px-1.5 py-1 transition-[border-color,box-shadow] duration-200 before:pointer-events-none before:absolute before:inset-x-3 before:top-0 before:h-px before:bg-gradient-to-r before:from-transparent before:via-accent/45 before:to-transparent before:opacity-0 before:transition-opacity before:duration-200 focus-within:before:opacity-100 ${
            open
              ? "border-accent/40 shadow-[0_0_12px_rgba(232,176,90,0.12)]"
              : "border-border-strong hover:border-border-strong focus-within:border-accent/40 focus-within:shadow-[0_0_10px_rgba(232,176,90,0.1)]"
          } ${error ? "!border-danger/50" : ""}`}
          aria-label={label}
        >
          <button
            type="button"
            onClick={() => step(-1)}
            disabled={!canDecrement}
            aria-label="Предыдущий год"
            className="focus-ring flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-[var(--radius-sm)] text-muted transition-colors hover:bg-bg-surface-hover hover:text-accent disabled:cursor-not-allowed disabled:opacity-30"
          >
            <Minus className="h-4 w-4" aria-hidden />
          </button>

          <input
            id={fieldId}
            type="text"
            inputMode="numeric"
            value={text}
            onChange={(e) => commit(e.target.value)}
            onFocus={() => setOpen(true)}
            onBlur={() => {
              if (text !== "" && value != null) setText(String(value));
            }}
            placeholder="1994"
            maxLength={4}
            aria-invalid={error != null}
            aria-describedby={error ? `${fieldId}-error` : undefined}
            className="font-mono-tech min-w-0 flex-1 cursor-text rounded-[var(--radius-sm)] border-0 bg-transparent px-1 py-1 text-center text-base font-semibold tabular-nums text-text outline-none placeholder:text-muted/50 focus:outline-none focus-visible:outline-none"
          />

          <button
            type="button"
            onClick={() => step(1)}
            disabled={!canIncrement}
            aria-label="Следующий год"
            className="focus-ring flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-[var(--radius-sm)] text-muted transition-colors hover:bg-bg-surface-hover hover:text-accent disabled:cursor-not-allowed disabled:opacity-30"
          >
            <Plus className="h-4 w-4" aria-hidden />
          </button>
        </div>

        {open ? (
          <div
            role="listbox"
            aria-label={`${label} — десятилетия`}
            className="surface-elevated absolute left-0 right-0 top-full z-50 mt-2 max-h-72 overflow-auto rounded-[var(--radius-sm)] border border-border-strong p-1 shadow-[0_12px_40px_rgba(0,0,0,0.45)]"
          >
            <div className="flex items-center justify-between px-2 pb-1 pt-2">
              <span className="font-mono-tech text-[0.6rem] text-faint">
                десятилетия
              </span>
              {hasValue ? (
                <button
                  type="button"
                  onClick={clear}
                  className="focus-ring font-mono-tech flex cursor-pointer items-center gap-1 rounded-full border border-border px-2 py-0.5 text-[0.6rem] text-muted transition-colors hover:border-accent/40 hover:text-accent"
                >
                  <X className="h-3 w-3" aria-hidden />
                  очистить
                </button>
              ) : null}
            </div>
            <div className="h-px w-full bg-border" aria-hidden />
            <ul className="p-1">
              {decades.map((decade) => {
                const isExpanded = effectiveDecade === decade.start;
                const decadeActive = activeDecadeStart === decade.start;
                return (
                  <li key={decade.start}>
                    <button
                      type="button"
                      onClick={() =>
                        setExpandedDecade(isExpanded ? null : decade.start)
                      }
                      aria-expanded={isExpanded}
                      className={`flex w-full cursor-pointer items-center justify-between gap-2 rounded-[var(--radius-sm)] px-3 py-2 text-left text-sm transition-colors ${
                        decadeActive
                          ? "bg-accent/8 text-accent-bright"
                          : "text-text hover:bg-bg-surface-hover"
                      }`}
                    >
                      <span className="font-mono-tech whitespace-nowrap">
                        {decade.label}
                      </span>
                      <ChevronDown
                        className={`h-3.5 w-3.5 shrink-0 text-muted transition-transform duration-200 ${
                          isExpanded ? "rotate-180" : ""
                        }`}
                        aria-hidden
                      />
                    </button>
                    {isExpanded ? (
                      <ul className="grid grid-cols-5 gap-1 px-1 pb-1 pt-1">
                        {decade.years.map((y) => {
                          const active = y === value;
                          return (
                            <li key={y} role="option" aria-selected={active}>
                              <button
                                type="button"
                                onClick={() => selectYear(y)}
                                className={`font-mono-tech flex h-8 w-full cursor-pointer items-center justify-center rounded-[var(--radius-sm)] text-xs tabular-nums transition-colors ${
                                  active
                                    ? "border border-accent/35 bg-accent/10 text-accent-bright"
                                    : "text-muted hover:bg-bg-surface-hover hover:text-text"
                                }`}
                              >
                                {y}
                              </button>
                            </li>
                          );
                        })}
                      </ul>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          </div>
        ) : null}
      </div>

      {error ? (
        <p id={`${fieldId}-error`} className="text-xs text-danger" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
