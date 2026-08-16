import { MovieRating, type MovieRatingRow } from "@/components/movies/MovieRating";
import { formatDate, formatRelativeDate } from "@/lib/shared/format";
import { isMovieWatched } from "@/lib/movies/movie-watched";

interface MovieRatingWatchedSectionProps {
  movieId: number;
  ratings: MovieRatingRow[];
  watchedAt: Date | null;
}

export function MovieRatingWatchedSection({
  movieId,
  ratings,
  watchedAt,
}: MovieRatingWatchedSectionProps) {
  const relativeWatched = formatRelativeDate(watchedAt);
  const watched = isMovieWatched(watchedAt, ratings.length);

  return (
    <section className="border-t border-border/60 pt-4">
      <h2 className="font-mono-tech mb-3 text-muted">оценка и просмотр</h2>
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <span className="font-mono-tech text-faint">оценки</span>
          <MovieRating movieId={movieId} ratings={ratings} />
        </div>
        <div className="flex flex-col gap-2 border-t border-border/60 pt-4">
          <span className="font-mono-tech text-faint">просмотрен</span>
          {watched ? (
            watchedAt ? (
              <div className="flex flex-col gap-1">
                <span className="font-mono text-xl font-medium tracking-wide text-text">
                  {formatDate(watchedAt)}
                </span>
                {relativeWatched ? (
                  <span className="font-mono-tech text-accent/80">
                    {relativeWatched}
                  </span>
                ) : null}
              </div>
            ) : (
              <span className="font-mono text-sm text-text">да, дата не указана</span>
            )
          ) : (
            <span className="font-mono text-sm text-faint">не отмечено</span>
          )}
        </div>
      </div>
    </section>
  );
}
