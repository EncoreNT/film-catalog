import { notFound } from "next/navigation";
import { BackLink } from "@/components/primitives/BackLink";
import { MovieReleasePanel } from "@/components/releases/MovieReleasePanel";
import { DuplicateMergeBanner } from "@/components/movies/DuplicateMergeBanner";
import { MovieCoverHero } from "@/components/movies/MovieCoverHero";
import { MovieDetailHeader } from "@/components/movies/MovieDetailHeader";
import { MovieRatingWatchedSection } from "@/components/movies/MovieRatingWatchedSection";
import { EmptyReleasesCard } from "@/components/movies/EmptyReleasesCard";
import { loadMovieDetailPage } from "@/lib/movies/load-movie-detail-page";

interface PageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ release?: string }>;
}

export default async function MoviePage({ params, searchParams }: PageProps) {
  const { slug } = await params;
  const resolvedSearch = await searchParams;

  const releaseIdParam = resolvedSearch.release
    ? Number(resolvedSearch.release)
    : null;

  const data = await loadMovieDetailPage(slug, releaseIdParam);
  if (!data) notFound();

  const {
    movie,
    mergeCandidates,
    coverUrl,
    genres,
    releaseViews,
    displayDuration,
    franchiseMemberships,
    activeReleaseId,
  } = data;

  return (
    <div className="space-y-10">
      <BackLink href="/">Назад к каталогу</BackLink>

      {mergeCandidates.length > 1 ? (
        <DuplicateMergeBanner
          currentMovieId={movie.id}
          candidates={mergeCandidates}
        />
      ) : null}

      <div className="grid gap-8 lg:grid-cols-[280px_1fr]">
        <MovieCoverHero coverUrl={coverUrl} title={movie.title} />

        <div className="space-y-8">
          <MovieDetailHeader
            movie={movie}
            genres={genres}
            displayDuration={displayDuration}
            franchiseMemberships={franchiseMemberships}
          />

          {releaseViews.length > 0 ? (
            <MovieReleasePanel
              movieId={movie.id}
              movieSlug={movie.slug}
              releases={releaseViews}
              initialActiveReleaseId={activeReleaseId ?? releaseViews[0].id}
            />
          ) : (
            <EmptyReleasesCard movieSlug={movie.slug} />
          )}

          <MovieRatingWatchedSection
            movieId={movie.id}
            rating={movie.rating}
            watchedAt={movie.watchedAt}
          />
        </div>
      </div>
    </div>
  );
}
