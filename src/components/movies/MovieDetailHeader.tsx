import { MovieApproveButton } from "@/components/movies/MovieApproveButton";
import { EditEntityLink } from "@/components/primitives/EditEntityLink";
import { DetailMetaLine } from "@/components/primitives/DetailMetaLine";
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
        <EditEntityLink
          href={`/movies/${movie.slug}/edit`}
          title="Редактировать фильм"
        />
      </div>
      <h1 className="font-display mt-3 text-4xl font-bold leading-[1.1] tracking-tight sm:text-5xl lg:text-5xl xl:text-6xl 2xl:text-6xl">
        {movie.title}
      </h1>
      <DetailMetaLine
        className="mt-3"
        items={[
          { key: "year", node: movie.year ? <span>{movie.year}</span> : null },
          {
            key: "duration",
            node: displayDuration ? (
              <span>{formatDuration(displayDuration, "long")}</span>
            ) : null,
          },
        ]}
      />
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
