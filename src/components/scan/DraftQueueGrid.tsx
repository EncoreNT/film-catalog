import Link from "next/link";
import { MovieCard } from "@/components/movies/MovieCard";
import { Button } from "@/components/primitives/Button";
import type { MovieWithTracks } from "@/lib/movies/movie-query";

interface DraftQueueGridProps {
  drafts: MovieWithTracks[];
  onApprove: (id: number) => void;
}

export function DraftQueueGrid({ drafts, onApprove }: DraftQueueGridProps) {
  return (
    <section>
      <div className="mb-6 flex items-center justify-between gap-4">
        <h2 className="font-display text-2xl font-semibold">
          Очередь черновиков
        </h2>
        <Link
          href="/?status=DRAFT"
          className="focus-ring text-sm text-accent hover:underline"
        >
          Все черновики →
        </Link>
      </div>
      {drafts.length === 0 ? (
        <div className="surface-card px-6 py-12 text-center text-sm text-muted">
          Нет черновиков. Запустите сканирование.
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
          {drafts.map((movie, index) => (
            <div key={movie.id} className="space-y-2">
              <MovieCard movie={movie} index={index} />
              <Button
                variant="primary"
                className="w-full"
                onClick={() => onApprove(movie.id)}
              >
                В каталог
              </Button>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
