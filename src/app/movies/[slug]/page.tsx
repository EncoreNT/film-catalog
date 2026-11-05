import { notFound } from "next/navigation";
import { BackLink } from "@/components/primitives/BackLink";
import { MovieReleasePanel } from "@/components/releases/MovieReleasePanel";
import { DuplicateMergeBanner } from "@/components/movies/DuplicateMergeBanner";
import { MovieCoverHero } from "@/components/movies/MovieCoverHero";
import { MovieDetailHeader } from "@/components/movies/MovieDetailHeader";
import { MovieRuntimeProvider } from "@/components/movies/MovieRuntimeContext";
import { MovieFranchises } from "@/components/movies/MovieFranchises";
import { MovieRemakes } from "@/components/movies/MovieRemakes";
import { MovieRatingWatchedSection } from "@/components/movies/MovieRatingWatchedSection";
import { EmptyReleasesCard } from "@/components/movies/EmptyReleasesCard";
import { MovieBillboard } from "@/components/movies/MovieBillboard";
import { EditEntityLink } from "@/components/primitives/EditEntityLink";
import "./movie-detail.css";
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
    movieSeconds,
    displayDuration,
    franchiseMemberships,
    remakeMemberships,
    activeReleaseId,
    catalogPrimaryReleaseId,
    partReleaseGroups,
    ratingRows,
    watches,
  } = data;

  return (
    <div className="movie-detail-page">
      <div className="movie-atmosphere" aria-hidden />
      <div className="movie-crumb">
        <BackLink href="/">К каталогу</BackLink>
        <EditEntityLink href={`/movies/${movie.slug}/edit`} title="Редактировать фильм" label="Редактировать фильм" />
      </div>

      {mergeCandidates.length > 1 ? (
        <DuplicateMergeBanner
          currentMovieId={movie.id}
          candidates={mergeCandidates}
        />
      ) : null}

      <MovieRuntimeProvider
        key={movie.id}
        movieSeconds={movieSeconds}
        partCount={movie.partCount}
        initialActiveId={activeReleaseId}
        releases={releaseViews.map((release) => ({
          id: release.id,
          version: release.version,
          durationSeconds: release.durationSeconds,
        }))}
      >
        <MovieBillboard
          poster={<MovieCoverHero coverUrl={coverUrl} title={movie.title} />}
          summary={
            <>
              <div className="movie-story">
                <MovieDetailHeader movie={movie} genres={genres} displayDuration={displayDuration} partCount={movie.partCount} />
                {movie.description && <p className="movie-synopsis">{movie.description}</p>}
              </div>
              <div className="movie-personal">
                <MovieRatingWatchedSection movieId={movie.id} ratings={ratingRows} watches={watches} />
                <MovieFranchises memberships={franchiseMemberships} />
                {remakeMemberships.some((membership) => membership.coMembers.length > 0) && (
                  <details className="movie-related">
                    <summary>Связанные версии</summary>
                    <MovieRemakes
                      memberships={remakeMemberships}
                      currentMovieFranchises={franchiseMemberships.map(({ franchise }) => franchise)}
                    />
                  </details>
                )}
              </div>
            </>
          }
        >
          {releaseViews.length > 0 ? (
            <MovieReleasePanel
              movieId={movie.id}
              movieSlug={movie.slug}
              releases={releaseViews}
              partGroups={partReleaseGroups}
              initialActiveReleaseId={
                activeReleaseId ?? releaseViews[0].id
              }
              primaryReleaseId={catalogPrimaryReleaseId}
            />
          ) : (
            <EmptyReleasesCard movieSlug={movie.slug} />
          )}
        </MovieBillboard>
      </MovieRuntimeProvider>
    </div>
  );
}
