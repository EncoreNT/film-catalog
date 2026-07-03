import { Library, Pencil } from "lucide-react";
import Link from "next/link";
import { MovieApproveButton } from "@/components/movies/MovieApproveButton";
import { TagPill } from "@/components/primitives/TagPill";
import { formatDuration } from "@/lib/shared/format";
import { displayGenreName } from "@/lib/shared/dictionaries";
import type { MovieStatus } from "@/generated/prisma/client";

export interface MovieDetailFranchiseMembership {
  id: number;
  franchise: {
    id: number;
    name: string;
    slug: string;
  };
}

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
    description: string | null;
  };
  genres: MovieDetailGenre[];
  displayDuration: number | null;
  franchiseMemberships: MovieDetailFranchiseMembership[];
}

export function MovieDetailHeader({
  movie,
  genres,
  displayDuration,
  franchiseMemberships,
}: MovieDetailHeaderProps) {
  return (
    <header>
      <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
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
          className="focus-ring font-mono-tech -mt-0.5 inline-flex shrink-0 items-center gap-1 text-[11px] text-faint transition-colors hover:text-accent"
          title="Редактировать фильм"
        >
          <Pencil className="h-3 w-3" aria-hidden />
          редактировать
        </Link>
      </div>
      <h1 className="font-display mt-2 text-4xl font-bold tracking-tight sm:text-5xl">
        {movie.title}
      </h1>
      <div className="font-mono-tech mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-muted">
        {movie.year ? <span>{movie.year}</span> : null}
        {displayDuration ? (
          <>
            {movie.year ? <span aria-hidden>·</span> : null}
            <span>{formatDuration(displayDuration, "long")}</span>
          </>
        ) : null}
      </div>
      {genres.length > 0 ? (
        <div className="mt-3 flex flex-wrap gap-2">
          {genres.map((g) => (
            <TagPill key={g.id}>{displayGenreName(g.name)}</TagPill>
          ))}
        </div>
      ) : null}

      {movie.description ? (
        <p className="mt-4 max-w-2xl text-sm leading-relaxed text-muted">
          {movie.description}
        </p>
      ) : null}
      {franchiseMemberships.length > 0 ? (
        <section className="mt-6 border-t border-border pt-5">
          <h2 className="font-mono-tech mb-3 text-faint">входит во франшизы</h2>
          <ul className="flex flex-wrap gap-2">
            {franchiseMemberships.map((membership) => (
              <li key={membership.id}>
                <TagPill
                  href={`/franchises/${membership.franchise.slug}`}
                  icon={<Library className="h-3.5 w-3.5 text-accent" aria-hidden />}
                  className="py-1.5"
                >
                  {membership.franchise.name}
                </TagPill>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </header>
  );
}
