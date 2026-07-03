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
    <section className="surface-card p-4 sm:p-5">
      <h2 className="font-mono-tech mb-3 text-muted">оценка и просмотр</h2>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-stretch sm:gap-0">
        <div className="flex flex-col gap-2 sm:flex-1 sm:pr-5">
          <span className="font-mono-tech text-faint">оценка</span>
          <MovieRating
            movieId={movieId}
            value={rating}
            watchedAt={watchedAt}
          />
        </div>
        <div
          className="hidden w-px self-stretch bg-border sm:block"
          aria-hidden
        />
        <div className="flex flex-col gap-2 sm:flex-1 sm:pl-5">
          <span className="font-mono-tech text-faint">просмотрен</span>
          {watchedAt ? (
            <div className="flex flex-col gap-0.5">
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
