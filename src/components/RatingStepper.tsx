"use client";

import { Minus, Plus, Star } from "lucide-react";

interface RatingStepperProps {
  label: string;
  value: number | null;
  onChange: (value: number | null) => void;
  min?: number;
  max?: number;
}

export function RatingStepper({
  label,
  value,
  onChange,
  min = 1,
  max = 10,
}: RatingStepperProps) {
  const current = value ?? 0;
  const canDecrement = current > min;
  const canIncrement = current < max;

  const increment = () => {
    if (current === 0) onChange(min);
    else if (current < max) onChange(current + 1);
  };

  const decrement = () => {
    if (current === 0) return;
    if (current === min) onChange(null);
    else onChange(current - 1);
  };

  return (
    <div className="flex flex-col gap-2">
      <label className="text-sm text-muted">{label}</label>
      <div
        className={`focus-ring flex min-h-11 items-center justify-between gap-1 rounded-[var(--radius-sm)] border bg-bg-elevated px-1.5 py-1 transition-all duration-200 ${
          value != null
            ? "border-accent/40 shadow-[0_0_16px_var(--accent-glow)]"
            : "border-border hover:border-border-strong"
        }`}
      >
        <button
          type="button"
          onClick={decrement}
          disabled={!canDecrement}
          aria-label="Уменьшить оценку"
          className="focus-ring flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-[var(--radius-sm)] text-muted transition-colors hover:bg-bg-surface-hover hover:text-accent disabled:cursor-not-allowed disabled:opacity-30"
        >
          <Minus className="h-4 w-4" aria-hidden />
        </button>

        <div className="flex flex-1 items-center justify-center gap-1.5">
          {value != null ? (
            <>
              <Star
                className="h-4 w-4 fill-accent text-accent"
                aria-hidden
              />
              <span className="font-mono-tech text-base font-semibold text-accent">
                {value}
              </span>
              <span className="font-mono-tech text-xs text-faint">/10</span>
            </>
          ) : (
            <span className="font-mono-tech text-sm text-faint">любая</span>
          )}
        </div>

        <button
          type="button"
          onClick={increment}
          disabled={!canIncrement}
          aria-label="Увеличить оценку"
          className="focus-ring flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-[var(--radius-sm)] text-muted transition-colors hover:bg-bg-surface-hover hover:text-accent disabled:cursor-not-allowed disabled:opacity-30"
        >
          <Plus className="h-4 w-4" aria-hidden />
        </button>
      </div>
    </div>
  );
}
