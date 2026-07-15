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
  /** Pin chrome; editor manages internal scroll (release edit on lg+).
   *  10.25rem ≈ header + main top padding + fixed FormActionBar. */
  fillViewport?: boolean;
}

/** Shared shell for /movies/[slug]/releases/new and .../[releaseId]/edit. */
export function ReleaseEditPageLayout({
  movie,
  eyebrow,
  releaseLabel,
  children,
  fillViewport = false,
}: ReleaseEditPageLayoutProps) {
  const chrome = (
    <>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <BackLink href={`/movies/${movie.slug}`}>Назад к фильму</BackLink>
      </div>

      <MovieReleasePageHeader
        movie={movie}
        eyebrow={eyebrow}
        releaseLabel={releaseLabel}
      />
    </>
  );

  if (fillViewport) {
    return (
      <div className="flex flex-col gap-6 lg:-mb-10 lg:h-[calc(100dvh-10.25rem)] lg:min-h-0 lg:overflow-hidden lg:gap-8">
        <div className="shrink-0 space-y-6 lg:space-y-8">{chrome}</div>
        <div className="min-h-0 flex-1 overflow-hidden">{children}</div>
      </div>
    );
  }

  return (
    <div className="space-y-10">
      {chrome}
      {children}
    </div>
  );
}
