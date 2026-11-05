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
    <section className="movie-journal" aria-label="Оценки и просмотры">
      <MovieRating movieId={movieId} ratings={ratings} />
      <MovieWatchLog movieId={movieId} watches={watches}
        ratingCount={ratings.filter((row) => row.rating != null).length} />
    </section>
  );
}
