"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check } from "lucide-react";
import { Button } from "@/components/primitives/Button";
import { MovieWatchHistoryModal } from "@/components/movies/MovieWatchHistoryModal";
import { apiFetch } from "@/lib/api/client";
import { isMovieWatched } from "@/lib/movies/movie-watched";
import {
  formatWatchCount,
  sortWatchesByDate,
  type MovieWatchEntry,
} from "@/lib/movies/movie-watch-date";
import { formatDate, formatRelativeDate } from "@/lib/shared/format";
import { parseISODate, toISODate } from "@/lib/shared/calendar";

interface MovieWatchLogProps {
  movieId: number;
  watches: MovieWatchEntry[];
  ratingCount: number;
}

export function MovieWatchLog({
  movieId,
  watches: watchEntries,
  ratingCount,
}: MovieWatchLogProps) {
  const router = useRouter();
  const [watches, setWatches] = useState(watchEntries);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const watchKey = watchEntries.map((row) => `${row.id}:${row.watchedOn}`).join(",");

  useEffect(() => {
    setWatches(
      watchKey
        ? watchKey.split(",").map((part) => {
            const [id, watchedOn] = part.split(":");
            return { id: Number(id), watchedOn };
          })
        : [],
    );
  }, [movieId, watchKey]);
  const [pending, startTransition] = useTransition();

  const rows = sortWatchesByDate(watches);
  const today = toISODate(new Date());
  const watchedToday = rows.some((row) => row.watchedOn === today);
  const latestIso = rows[0]?.watchedOn ?? null;
  const latestDate = latestIso ? parseISODate(latestIso) : null;
  const relativeWatched = formatRelativeDate(latestDate);
  const watched = isMovieWatched(latestDate, ratingCount);

  const markWatched = () => {
    if (watchedToday || pending) return;
    setError(null);

    startTransition(async () => {
      try {
        const result = await apiFetch<{ id: number; watchedOn: string }>(
          `/api/movies/${movieId}/watches`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ watchedOn: today }),
          },
          "Не удалось записать просмотр",
        );
        setWatches((current) =>
          sortWatchesByDate(
            current.some((row) => row.id === result.id)
              ? current
              : [...current, { id: result.id, watchedOn: result.watchedOn }],
          ),
        );
        router.refresh();
      } catch {
        setError("Не удалось записать просмотр");
      }
    });
  };

  return (
    <div className="flex flex-col gap-3 border-t border-border/60 pt-4">
      <span className="font-mono-tech text-faint">просмотрен</span>
      {watched ? (
        latestDate ? (
          <div className="flex flex-col gap-1">
            <span className="font-mono text-xl font-medium tracking-wide text-text">
              {formatDate(latestIso)}
            </span>
            {relativeWatched ? (
              <span className="font-mono-tech text-accent/80">
                {relativeWatched}
              </span>
            ) : null}
            {rows.length > 0 ? (
              <button
                type="button"
                className="focus-ring font-mono-tech w-fit rounded-sm text-left text-muted transition-colors hover:text-accent"
                onClick={() => setHistoryOpen(true)}
              >
                {formatWatchCount(rows.length)} · история
              </button>
            ) : null}
          </div>
        ) : (
          <div className="flex flex-col gap-1">
            <span className="font-mono text-xl font-medium tracking-wide text-text">
              Смотрели
            </span>
            <span className="font-mono-tech text-faint">дату не записывали</span>
          </div>
        )
      ) : (
        <span className="font-mono text-sm text-faint">не отмечено</span>
      )}

      {watchedToday ? (
        <p className="font-mono-tech flex items-center gap-2 text-accent/80">
          <Check className="h-3.5 w-3.5" aria-hidden />
          уже отмечено сегодня
        </p>
      ) : (
        <Button
          type="button"
          variant="secondary"
          className="w-full"
          loading={pending}
          onClick={markWatched}
        >
          Посмотрели
        </Button>
      )}

      {error ? (
        <p className="text-sm text-danger" role="alert">
          {error}
        </p>
      ) : null}

      <MovieWatchHistoryModal
        open={historyOpen}
        onClose={() => setHistoryOpen(false)}
        movieId={movieId}
        watches={rows}
        onChange={setWatches}
      />
    </div>
  );
}
