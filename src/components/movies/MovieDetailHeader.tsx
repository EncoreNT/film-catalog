import { Pencil } from "lucide-react";
import Link from "next/link";
import { MovieApproveButton } from "@/components/movies/MovieApproveButton";
import { TagPill } from "@/components/primitives/TagPill";
import { formatDuration } from "@/lib/shared/format";
import { displayGenreName } from "@/lib/shared/dictionaries";
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
}

export function MovieDetailHeader({
  movie,
  genres,
  displayDuration,
}: MovieDetailHeaderProps) {
  return (
    <header>
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <p className="font-mono-tech text-accent">
            {movie.status === "DRAFT"
              ? "черновик"
              : movie.status === "EXCLUDED"
                ? "исключён"
                : "каталог"}
          </p>
          {movie.status === "DRAFT" ? (
            <MovieApproveButton
              compact
              movieId={movie.id}
              title={movie.title}
            />
          ) : null}
        </div>
        <Link
          href={`/movies/${movie.slug}/edit`}
          className="focus-ring inline-flex shrink-0 items-center gap-2 rounded-full border border-border-strong bg-bg-surface px-3.5 py-1.5 text-xs text-muted transition-all duration-300 hover:border-accent/50 hover:bg-accent/10 hover:text-accent"
          title="Редактировать фильм"
        >
          <Pencil className="h-3.5 w-3.5" aria-hidden />
          <span className="font-mono-tech">редактировать</span>
        </Link>
      </div>
      <h1 className="font-display mt-3 text-4xl font-bold leading-[1.08] tracking-tight sm:text-5xl xl:text-5xl 2xl:text-6xl">
        {movie.title}
      </h1>
      <div className="font-mono-tech mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-muted">
        {movie.year ? <span>{movie.year}</span> : null}
        {movie.year && displayDuration ? (
          <span aria-hidden className="text-faint">
            ·
          </span>
        ) : null}
        {displayDuration ? (
          <span>{formatDuration(displayDuration, "long")}</span>
        ) : null}
      </div>
      {genres.length > 0 ? (
        <div className="mt-3 flex flex-wrap gap-2">
          {genres.map((g) => (
            <TagPill key={g.id}>{displayGenreName(g.name)}</TagPill>
          ))}
        </div>
      ) : null}
    </header>
  );
}
