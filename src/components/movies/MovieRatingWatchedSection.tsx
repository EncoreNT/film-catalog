import { MovieRating, type MovieRatingRow } from "@/components/movies/MovieRating";
import { MovieWatchLog } from "@/components/movies/MovieWatchLog";
import type { MovieWatchEntry } from "@/lib/movies/movie-watch-date";

interface MovieRatingWatchedSectionProps {
  movieId: number;
  ratings: MovieRatingRow[];
  watches: MovieWatchEntry[];
}

export function MovieRatingWatchedSection({
  movieId,
  ratings,
  watches,
}: MovieRatingWatchedSectionProps) {
  return (
    <section className="border-t border-border/60 pt-4">
      <h2 className="font-mono-tech mb-3 text-muted">оценка и просмотр</h2>
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <span className="font-mono-tech text-faint">оценки</span>
          <MovieRating movieId={movieId} ratings={ratings} />
        </div>
        <MovieWatchLog
          movieId={movieId}
          watches={watches}
          ratingCount={ratings.length}
        />
      </div>
    </section>
  );
}
