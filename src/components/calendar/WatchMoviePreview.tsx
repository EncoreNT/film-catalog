"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowUpRight, Film, Star } from "lucide-react";
import { ApiCoverImage } from "@/components/primitives/ApiCoverImage";
import { formatRatingDisplay } from "@/lib/movies/movie-rating";
import { watchInstantFromISODate } from "@/lib/movies/movie-watch-date";
import type { CalendarWatch } from "@/lib/movies/watch-calendar";

export const dayFormatter = new Intl.DateTimeFormat("ru-RU", {
  day: "numeric", month: "long", year: "numeric", timeZone: "UTC",
});

export function Poster({ movie }: { movie: CalendarWatch["movie"] }) {
  const [failed, setFailed] = useState(false);
  return movie.coverUrl && !failed
    ? <ApiCoverImage src={movie.coverUrl} alt="" fill sizes="180px" onError={() => setFailed(true)} className="object-cover" />
    : <span className="watch-poster-fallback"><Film aria-hidden /><span>{movie.title.split(" / ")[0]}</span></span>;
}

export function MoviePreview({ watch, compact = false }: { watch: CalendarWatch; compact?: boolean }) {
  const { movie } = watch;
  const [title, ...original] = movie.title.split(" / ");
  return (
    <div className={`watch-preview ${compact ? "watch-preview--compact" : ""}`}>
      <div className="watch-preview-heading">
        <div className="watch-preview-cover"><Poster movie={movie} /></div>
        <div className="min-w-0">
          {compact && <h3>{title}</h3>}
          {original.length > 0 && <p className="watch-preview-original">{original.join(" / ")}</p>}
          <p className="watch-preview-meta">{[movie.year, ...movie.genres].filter(Boolean).join(" · ")}</p>
          <p className="watch-preview-rating"><Star size={16} aria-hidden />
            {movie.rating == null ? <span>Пока без оценки</span> : <><strong>{formatRatingDisplay(movie.rating)}</strong><span>/ 10</span></>}
          </p>
          <p className="watch-preview-caption">Текущая оценка</p>
        </div>
      </div>
      {movie.ratings.length > 0 && <div className="watch-preview-raters">
        {movie.ratings.map((rater) => <span key={rater.name}>{rater.name} <strong>{rater.rating}</strong></span>)}
      </div>}
      <p className="watch-preview-description">{movie.description || "Описание пока не добавлено."}</p>
      <p className="watch-preview-watched">Просмотр: {dayFormatter.format(watchInstantFromISODate(watch.watchedOn))}</p>
      {!compact && <Link className="site-action focus-ring" href={`/movies/${movie.slug}`}>Открыть фильм <ArrowUpRight size={16} aria-hidden /></Link>}
    </div>
  );
}

