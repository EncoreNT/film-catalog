"use client";

import { useState } from "react";
import { CalendarPlus, Check, Eye, History } from "lucide-react";
import { MovieWatchHistoryModal } from "@/components/movies/MovieWatchHistoryModal";
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

export function MovieWatchLog({ movieId, watches: watchEntries, ratingCount }: MovieWatchLogProps) {
  const [watches, setWatches] = useState(watchEntries);
  const [historyMode, setHistoryMode] = useState<"add" | "history" | null>(null);
  const watchKey = watchEntries.map((row) => `${row.id}:${row.watchedOn}`).join(",");
  const [serverWatchKey, setServerWatchKey] = useState(watchKey);
  if (watchKey !== serverWatchKey) {
    setServerWatchKey(watchKey);
    setWatches(watchEntries);
  }

  const rows = sortWatchesByDate(watches);
  const today = toISODate(new Date());
  const watchedToday = rows.some((row) => row.watchedOn === today);
  const latestIso = rows[0]?.watchedOn ?? null;
  const latestDate = latestIso ? parseISODate(latestIso) : null;
  const relativeWatched = formatRelativeDate(latestDate);
  const watched = isMovieWatched(latestDate, ratingCount);

  return (
    <div className="movie-watch-log">
      <div className="movie-watch-heading">
        <span className="movie-journal-label"><Eye size={15} aria-hidden /> Последний просмотр</span>
        {rows.length > 0 && (
          <button type="button" className="movie-history-trigger focus-ring" aria-haspopup="dialog"
            title="История просмотров" onClick={() => setHistoryMode("history")}>
            <History size={14} aria-hidden /> История
            <small><span className="movie-count-full">{formatWatchCount(rows.length)}</span><span className="movie-count-short">{rows.length}</span></small>
          </button>
        )}
      </div>
      <div className="movie-last-watch">
        {latestDate && latestIso ? <time dateTime={latestIso}>{formatDate(latestIso)}</time>
          : watched ? "Дата не записана" : "Ещё не смотрели"}
        {relativeWatched && <small>{relativeWatched}</small>}
        {watchedToday && (
          <span className="movie-watched-today" role="status" title="Просмотр за сегодня отмечен">
            <Check size={16} aria-hidden /><span className="sr-only">Просмотр за сегодня отмечен</span>
          </span>
        )}
      </div>
      <button type="button" className="movie-watch-add focus-ring" aria-haspopup="dialog"
        onClick={() => setHistoryMode("add")}>
        <CalendarPlus size={15} aria-hidden /> Добавить просмотр
      </button>
      {historyMode && (
        <MovieWatchHistoryModal
          open
          initialMode={historyMode}
          onClose={() => setHistoryMode(null)}
          movieId={movieId}
          watches={rows}
          onChange={setWatches}
        />
      )}
    </div>
  );
}
