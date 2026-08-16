"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { StarRating } from "@/components/primitives/StarRating";
import { apiFetch } from "@/lib/api/client";
import {
  computeAverageRating,
  formatRatingDisplay,
} from "@/lib/movies/movie-rating";

export type MovieRatingRow = {
  raterId: number;
  raterName: string;
  rating: number | null;
};

interface MovieRatingProps {
  movieId: number;
  ratings: MovieRatingRow[];
}

export function MovieRating({ movieId, ratings }: MovieRatingProps) {
  const router = useRouter();
  const [rows, setRows] = useState(ratings);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const average = computeAverageRating(
    rows
      .filter((row): row is MovieRatingRow & { rating: number } => row.rating != null)
      .map((row) => ({ rating: row.rating })),
  );

  const handleChange = (raterId: number, next: number | null) => {
    const previous = rows;
    setRows((current) =>
      current.map((row) =>
        row.raterId === raterId ? { ...row, rating: next } : row,
      ),
    );
    setError(null);

    startTransition(async () => {
      try {
        if (next == null) {
          await apiFetch(
            `/api/movies/${movieId}/ratings`,
            {
              method: "DELETE",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ raterId }),
            },
            "Не удалось удалить оценку",
          );
        } else {
          await apiFetch(
            `/api/movies/${movieId}/ratings`,
            {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ raterId, rating: next }),
            },
            "Не удалось сохранить оценку",
          );
        }
        router.refresh();
      } catch {
        setRows(previous);
        setError("Не удалось сохранить оценку");
      }
    });
  };

  return (
    <div className="flex flex-col gap-3">
      {average != null ? (
        <div className="flex items-baseline gap-2">
          <span className="font-mono text-2xl font-semibold tabular-nums text-accent-bright">
            {formatRatingDisplay(average)}
          </span>
          <span className="font-mono-tech text-xs text-faint">средняя</span>
        </div>
      ) : (
        <p className="font-mono-tech text-sm text-faint">ещё нет оценок</p>
      )}

      <div className="space-y-3">
        {rows.map((row) => (
          <div key={row.raterId} className="flex flex-col gap-1.5">
            <span className="font-mono-tech text-xs text-muted">{row.raterName}</span>
            <StarRating
              value={row.rating}
              onChange={(next) => handleChange(row.raterId, next)}
            />
          </div>
        ))}
      </div>

      {error ? (
        <p className="text-sm text-danger" role="alert">
          {error}
        </p>
      ) : null}
      {pending ? (
        <p className="font-mono-tech text-xs text-faint">сохранение…</p>
      ) : null}
    </div>
  );
}
