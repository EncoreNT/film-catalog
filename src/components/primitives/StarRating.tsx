"use client";

import { useState } from "react";
import { Star } from "lucide-react";

interface StarRatingProps {
  value: number | null;
  onChange?: (value: number | null) => void;
  label?: string;
  disabled?: boolean;
  size?: "sm" | "md";
}

export function StarRating({ value, onChange, size = "md", label = "Оценка фильма", disabled = false }: StarRatingProps) {
  const [hoverRating, setHoverRating] = useState<number | null>(null);
  const iconSize = size === "sm" ? "h-3.5 w-3.5" : "h-5 w-5";
  const interactive = !!onChange;
  const previewRating = interactive ? hoverRating : null;
  const displayValue = previewRating ?? value;

  return (
    <div className={size === "sm" ? "movie-star-rating" : "flex flex-col gap-3"}>
      <div className={size === "sm" ? "movie-rater-value" : "flex min-h-16 items-baseline gap-2"}>
        <span className={size === "md" ? "font-display text-6xl font-bold text-accent" : undefined}>
          {displayValue ?? "—"}
        </span>
        <span className="sr-only"> из 10</span>
      </div>
      <div
        className="inline-flex items-center"
        role="group"
        aria-label={label}
        onPointerLeave={() => setHoverRating(null)}
      >
        {Array.from({ length: 10 }, (_, i) => {
          const rating = i + 1;
          const filled = displayValue != null && rating <= displayValue;
          return (
            <button
              key={rating}
              type="button"
              disabled={!interactive}
              aria-disabled={!interactive || disabled}
              onPointerEnter={(event) => {
                if (event.pointerType === "mouse") setHoverRating(rating);
              }}
              onClick={() => {
                if (disabled) return;
                setHoverRating(null);
                onChange?.(value === rating ? null : rating);
              }}
              className={`focus-ring rounded p-0.5 transition-colors ${
                interactive ? "cursor-pointer" : "cursor-default"
              }`}
              aria-label={`${rating} из 10`}
              aria-pressed={value === rating}
              title={value === rating ? "Снять оценку" : `${rating} из 10`}
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
