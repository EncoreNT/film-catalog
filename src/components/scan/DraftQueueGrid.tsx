import Link from "next/link";
import { MovieCard } from "@/components/movies/MovieCard";
import { Button } from "@/components/primitives/Button";
import type { MovieWithTracks } from "@/lib/movies/movie-query";

interface DraftQueueGridProps {
  drafts: MovieWithTracks[];
  draftTotal: number;
  onApprove: (id: number) => void;
}

export function DraftQueueGrid({
  drafts,
  draftTotal,
  onApprove,
}: DraftQueueGridProps) {
  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <h2 className="font-display text-xl font-semibold tracking-tight">
          Черновики
          <span className="ml-2 font-mono-tech text-sm font-normal tabular-nums text-muted">
            {draftTotal}
          </span>
        </h2>
        {draftTotal > 0 ? (
          <Link
            href="/?status=DRAFT"
            className="focus-ring font-mono-tech text-xs text-accent hover:underline"
          >
            все в каталоге
          </Link>
        ) : null}
      </div>

      {drafts.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted">
          Очередь пуста. Нажмите «Сканировать», чтобы импортировать новые файлы.
        </p>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
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
