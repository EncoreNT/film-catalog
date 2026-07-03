"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { StarRating } from "@/components/primitives/StarRating";
import { apiFetch } from "@/lib/api/client";

interface MovieRatingProps {
  movieId: number;
  value: number | null;
  watchedAt: Date | string | null;
}

export function MovieRating({ movieId, value, watchedAt }: MovieRatingProps) {
  const router = useRouter();
  const [rating, setRating] = useState<number | null>(value);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const handleChange = (next: number | null) => {
    const previous = rating;
    setRating(next);
    setError(null);
    startTransition(async () => {
      const payload: { rating: number | null; watchedAt?: string } = {
        rating: next,
      };
      if (!watchedAt && next != null) {
        payload.watchedAt = new Date().toISOString();
      }
      try {
        await apiFetch(
          `/api/movies/${movieId}`,
          {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          },
          "Не удалось сохранить оценку",
        );
        router.refresh();
      } catch {
        setRating(previous);
        setError("Не удалось сохранить оценку");
      }
    });
  };

  return (
    <div className="flex flex-col gap-1">
      <StarRating value={rating} onChange={handleChange} />
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
