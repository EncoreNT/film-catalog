import type { ReactNode } from "react";
import { BackLink } from "@/components/primitives/BackLink";
import {
  MovieReleasePageHeader,
  type MovieReleasePageHeaderMovie,
} from "@/components/releases/MovieReleasePageHeader";

interface ReleaseEditPageLayoutProps {
  movie: MovieReleasePageHeaderMovie;
  eyebrow: string;
  releaseLabel?: string;
  children: ReactNode;
}

/** Shared shell for /movies/[slug]/releases/new and .../[releaseId]/edit. */
export function ReleaseEditPageLayout({
  movie,
  eyebrow,
  releaseLabel,
  children,
}: ReleaseEditPageLayoutProps) {
  return (
    <div className="space-y-10">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <BackLink href={`/movies/${movie.slug}`}>Назад к фильму</BackLink>
      </div>

      <MovieReleasePageHeader
        movie={movie}
        eyebrow={eyebrow}
        releaseLabel={releaseLabel}
      />

      {children}
    </div>
  );
}
