import { MovieRating } from "@/components/movies/MovieRating";
import { formatDate, formatRelativeDate } from "@/lib/shared/format";

interface MovieRatingWatchedSectionProps {
  movieId: number;
  rating: number | null;
  watchedAt: Date | null;
}

export function MovieRatingWatchedSection({
  movieId,
  rating,
  watchedAt,
}: MovieRatingWatchedSectionProps) {
  const relativeWatched = formatRelativeDate(watchedAt);

  return (
    <section className="border-t border-border/60 pt-4">
      <h2 className="font-mono-tech mb-3 text-muted">оценка и просмотр</h2>
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <span className="font-mono-tech text-faint">оценка</span>
          <MovieRating
            movieId={movieId}
            value={rating}
            watchedAt={watchedAt}
          />
        </div>
        <div className="flex flex-col gap-2 border-t border-border/60 pt-4">
          <span className="font-mono-tech text-faint">просмотрен</span>
          {watchedAt ? (
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
            <span className="font-mono text-sm text-faint">не отмечено</span>
          )}
        </div>
      </div>
    </section>
  );
}
