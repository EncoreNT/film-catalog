"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Star } from "lucide-react";
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
  const saving = useRef(false);
  const [rows, setRows] = useState(ratings);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const rated = rows.filter((row): row is MovieRatingRow & { rating: number } => row.rating != null);
  const average = computeAverageRating(rated);

  const handleChange = async (raterId: number, next: number | null) => {
    if (saving.current) return;
    saving.current = true;
    setPending(true);
    const previous = rows;
    setRows(rows.map((row) => row.raterId === raterId ? { ...row, rating: next } : row));
    setError(null);
    try {
      await apiFetch(
        `/api/movies/${movieId}/ratings`,
        {
          method: next == null ? "DELETE" : "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(next == null ? { raterId } : { raterId, rating: next }),
        },
        "Не удалось сохранить оценку",
      );
      router.refresh();
    } catch {
      setRows(previous);
      setError("Не удалось сохранить оценку");
    } finally {
      saving.current = false;
      setPending(false);
    }
  };

  return (
    <div className="movie-ratings">
      <div className="movie-journal-label">
        <Star size={15} aria-hidden /> Оценки
        <strong aria-label={`Средняя оценка: ${average == null ? "нет" : formatRatingDisplay(average)}`}>
          {average == null ? "—" : formatRatingDisplay(average)}
        </strong>
      </div>
      {rows.map((row) => (
        <div className="movie-rater" key={row.raterId}>
          <span>{row.raterName}</span>
          <StarRating size="sm" label={`Оценка — ${row.raterName}`} disabled={pending}
            value={row.rating} onChange={(next) => void handleChange(row.raterId, next)} />
        </div>
      ))}
      {rows.length === 0 && <p className="text-xs text-muted">Нет зрителей</p>}
      {error && <p className="text-sm text-danger" role="alert">{error}</p>}
    </div>
  );
}
