"use client";

import { Star } from "lucide-react";

interface StarRatingProps {
  value: number | null;
  onChange?: (value: number | null) => void;
  size?: "sm" | "md";
}

export function StarRating({ value, onChange, size = "md" }: StarRatingProps) {
  const iconSize = size === "sm" ? "h-3.5 w-3.5" : "h-5 w-5";

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-baseline gap-2">
        {value != null ? (
          <>
            <span
              className="font-display text-6xl font-bold leading-none text-accent"
              style={{ textShadow: "0 0 28px var(--accent-glow)" }}
            >
              {value}
            </span>
            <span className="font-mono text-sm tracking-wider text-muted">
              / 10
            </span>
          </>
        ) : (
          <span className="font-mono text-sm tracking-wider text-faint">
            без оценки
          </span>
        )}
      </div>
      <div
        className="inline-flex items-center gap-0.5"
        role={onChange ? "radiogroup" : undefined}
        aria-label="Оценка фильма"
      >
        {Array.from({ length: 10 }, (_, i) => {
          const rating = i + 1;
          const filled = value != null && rating <= value;
          return (
            <button
              key={rating}
              type="button"
              disabled={!onChange}
              onClick={() => onChange?.(value === rating ? null : rating)}
              className={`focus-ring rounded p-0.5 transition-colors ${
                onChange ? "cursor-pointer hover:scale-110" : "cursor-default"
              }`}
              aria-label={`${rating} из 10`}
              aria-checked={value === rating}
              role={onChange ? "radio" : undefined}
            >
              <Star
                className={`${iconSize} ${
                  filled
                    ? "fill-accent text-accent"
                    : "fill-transparent text-muted/40"
                }`}
              />
            </button>
          );
        })}
      </div>
    </div>
  );
}
