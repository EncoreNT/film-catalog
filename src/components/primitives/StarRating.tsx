"use client";

import { useState } from "react";
import { Star } from "lucide-react";

interface StarRatingProps {
  value: number | null;
  onChange?: (value: number | null) => void;
  size?: "sm" | "md";
}

export function StarRating({ value, onChange, size = "md" }: StarRatingProps) {
  const [hoverRating, setHoverRating] = useState<number | null>(null);
  const iconSize = size === "sm" ? "h-3.5 w-3.5" : "h-5 w-5";
  const interactive = !!onChange;
  const previewRating = interactive ? hoverRating : null;
  const displayValue = previewRating ?? value;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex min-h-16 items-baseline gap-2">
        {displayValue != null ? (
          <>
            <span
              className={`font-display text-6xl font-bold leading-none transition-colors ${
                previewRating != null ? "text-accent/75" : "text-accent"
              }`}
              style={{ textShadow: "0 0 28px var(--accent-glow)" }}
            >
              {displayValue}
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
        role={interactive ? "radiogroup" : undefined}
        aria-label="Оценка фильма"
        onMouseLeave={() => setHoverRating(null)}
      >
        {Array.from({ length: 10 }, (_, i) => {
          const rating = i + 1;
          const filled = displayValue != null && rating <= displayValue;
          return (
            <button
              key={rating}
              type="button"
              disabled={!interactive}
              onMouseEnter={() => setHoverRating(rating)}
              onClick={() => onChange?.(value === rating ? null : rating)}
              className={`focus-ring rounded p-0.5 transition-colors ${
                interactive ? "cursor-pointer" : "cursor-default"
              }`}
              aria-label={`${rating} из 10`}
              aria-checked={value === rating}
              role={interactive ? "radio" : undefined}
            >
              <Star
                className={`${iconSize} transition-colors ${
                  filled
                    ? previewRating != null
                      ? "fill-accent/70 text-accent/70"
                      : "fill-accent text-accent"
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
