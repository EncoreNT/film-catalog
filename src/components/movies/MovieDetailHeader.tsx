import { CalendarDays, Clock } from "lucide-react";
import { MovieApproveButton } from "@/components/movies/MovieApproveButton";
import { DetailMetaLine } from "@/components/primitives/DetailMetaLine";
import { displayGenreName } from "@/lib/shared/dictionaries";
import { formatSeriesCountLabel } from "@/lib/movies/multipart-duration";
import { MovieRuntimeMeta } from "@/components/movies/MovieRuntimeMeta";
import type { MovieStatus } from "@/generated/prisma/client";

export interface MovieDetailGenre {
  id: number;
  name: string;
}

interface MovieDetailHeaderProps {
  movie: {
    id: number;
    slug: string;
    title: string;
    year: number | null;
    status: MovieStatus;
  };
  genres: MovieDetailGenre[];
  displayDuration: number | null;
  partCount?: number | null;
}

export function MovieDetailHeader({
  movie,
  genres,
  displayDuration,
  partCount,
}: MovieDetailHeaderProps) {
  const [title, ...otherTitles] = movie.title.trim().split(" / ");
  return (
    <header className="movie-heading" data-long-title={title.length > 38}>
      {movie.status !== "CATALOG" && (
        <div className="movie-status">
          {movie.status === "DRAFT" ? "Черновик" : "Исключён"}
          <MovieApproveButton compact restoreFromExcluded={movie.status === "EXCLUDED"}
            movieId={movie.id} title={movie.title} />
        </div>
      )}
      <h1>{title}</h1>
      {otherTitles.length > 0 && <p className="movie-original">{otherTitles.join(" / ")}</p>}
      <DetailMetaLine
        className="movie-meta" separator="pipe"
        items={[
          { key: "year", node: movie.year ? <span className="movie-fact"><CalendarDays size={15} aria-hidden />{movie.year}</span> : null },
          {
            key: "series",
            node:
              partCount != null && partCount > 1 ? (
                <span>{formatSeriesCountLabel(partCount)}</span>
              ) : null,
          },
          {
            key: "duration",
            node: displayDuration ? (
              <span className="movie-fact"><Clock size={15} aria-hidden />
                <MovieRuntimeMeta fallbackSeconds={displayDuration} />
              </span>
            ) : null,
          },
        ]}
      />
      {genres.length > 0 && (
        <p className="movie-genres">{genres.map((genre) => displayGenreName(genre.name)).join(", ")}</p>
      )}
    </header>
  );
}
