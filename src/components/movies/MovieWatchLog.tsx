"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CalendarPlus, Check, Eye, History, LoaderCircle } from "lucide-react";
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

  const [serverWatchKey, setServerWatchKey] = useState(watchKey);
  if (watchKey !== serverWatchKey) {
    setServerWatchKey(watchKey);
    setWatches(watchEntries);
  }
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
    <div className="movie-watch-log">
      <div className="movie-watch-heading">
        <span className="movie-journal-label"><Eye size={15} aria-hidden /> Последний просмотр</span>
        {rows.length > 0 && (
          <button type="button" className="movie-history-trigger focus-ring" aria-haspopup="dialog"
            aria-label={`История ${formatWatchCount(rows.length)}`}
            title="История просмотров" onClick={() => setHistoryOpen(true)}>
            <History size={14} aria-hidden /> История
            <small><span className="movie-count-full">{formatWatchCount(rows.length)}</span><span className="movie-count-short">{rows.length}</span></small>
          </button>
        )}
      </div>
      <div className="movie-last-watch">
        {latestDate && latestIso ? <time dateTime={latestIso}>{formatDate(latestIso)}</time>
          : watched ? "Дата не записана" : "Ещё не смотрели"}
        {relativeWatched && <small>{relativeWatched}</small>}
        {watchedToday ? (
          <span className="movie-watched-today" role="status" title="Просмотр за сегодня отмечен">
            <Check size={16} aria-hidden /><span className="sr-only">Просмотр за сегодня отмечен</span>
          </span>
        ) : (
          <button type="button" className="movie-watch-action focus-ring" disabled={pending}
            aria-label="Отметить просмотр сегодня" title="Отметить просмотр сегодня" onClick={markWatched}>
            {pending ? <LoaderCircle size={16} className="motion-safe:animate-spin" aria-hidden /> : <CalendarPlus size={16} aria-hidden />}
          </button>
        )}
      </div>
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
