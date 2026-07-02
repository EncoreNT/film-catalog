import Link from "next/link";
import { ApiCoverImage } from "@/components/primitives/ApiCoverImage";
import { movieCoverUrlFromMovie } from "@/lib/cover-url";

export interface MovieReleasePageHeaderMovie {
  id: number;
  slug: string;
  title: string;
  year: number | null;
  coverPath: string | null;
  updatedAt: Date;
}

interface MovieReleasePageHeaderProps {
  movie: MovieReleasePageHeaderMovie;
  eyebrow: string;
  releaseLabel?: string;
}

export function MovieReleasePageHeader({
  movie,
  eyebrow,
  releaseLabel,
}: MovieReleasePageHeaderProps) {
  const coverUrl = movieCoverUrlFromMovie(movie);

  return (
    <header className="flex gap-4 sm:gap-5">
      <Link
        href={`/movies/${movie.slug}`}
        className="focus-ring group shrink-0"
        title={`Открыть «${movie.title}»`}
      >
        <div className="surface-card relative aspect-[2/3] w-[4.5rem] overflow-hidden transition-colors group-hover:ring-1 group-hover:ring-accent/40 sm:w-[5.5rem]">
          {coverUrl ? (
            <ApiCoverImage
              src={coverUrl}
              alt={`Обложка: ${movie.title}`}
              fill
              sizes="88px"
              className="object-cover transition-transform duration-300 group-hover:scale-[1.03]"
            />
          ) : (
            <div className="flex h-full items-center justify-center bg-bg-elevated p-2 text-center">
              <span className="font-display text-[10px] font-bold leading-tight text-muted sm:text-xs">
                {movie.title}
              </span>
            </div>
          )}
        </div>
      </Link>

      <div className="min-w-0 flex-1 pt-0.5">
        <p className="font-mono-tech text-accent">{eyebrow}</p>
        <h1 className="font-display mt-1.5 text-2xl font-bold tracking-tight sm:mt-2 sm:text-3xl">
          {movie.title}
        </h1>
        <div className="font-mono-tech mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted">
          {movie.year ? <span>{movie.year}</span> : null}
          {releaseLabel ? (
            <>
              {movie.year ? <span aria-hidden>·</span> : null}
              <span>{releaseLabel}</span>
            </>
          ) : null}
        </div>
      </div>
    </header>
  );
}
