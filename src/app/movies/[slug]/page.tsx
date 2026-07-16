import { notFound } from "next/navigation";
import { BackLink } from "@/components/primitives/BackLink";
import { MovieReleasePanel } from "@/components/releases/MovieReleasePanel";
import { DuplicateMergeBanner } from "@/components/movies/DuplicateMergeBanner";
import { MovieCoverHero } from "@/components/movies/MovieCoverHero";
import { MovieDetailHeader } from "@/components/movies/MovieDetailHeader";
import { MovieFranchises } from "@/components/movies/MovieFranchises";
import { MovieRatingWatchedSection } from "@/components/movies/MovieRatingWatchedSection";
import { EmptyReleasesCard } from "@/components/movies/EmptyReleasesCard";
import { SpotlightTarget } from "@/components/layout/SpotlightTarget";
import { loadMovieDetailPage } from "@/lib/movies/load-movie-detail-page";
import { prisma } from "@/lib/db/prisma";
import { buildInclude } from "@/lib/builds/build-queue";
import { serializeBuild } from "@/lib/builds/build-serialize";
import { MovieBuildJobsPanel } from "@/components/builds/MovieBuildJobsPanel";

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

  const recentBuilds = await prisma.releaseBuild.findMany({
    where: { movieId: data.movie.id },
    include: buildInclude,
    orderBy: { createdAt: "desc" },
    take: 5,
  });

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
    <div className="space-y-8 xl:space-y-10 2xl:space-y-12">
      <BackLink href="/">Назад к каталогу</BackLink>

      {mergeCandidates.length > 1 ? (
        <DuplicateMergeBanner
          currentMovieId={movie.id}
          candidates={mergeCandidates}
        />
      ) : null}

      {/* Title band — full-width statement across the page. The header
          (status, title, year, genres, edit) sits above the two-column
          body so the H1 can stretch wide instead of wrapping inside the
          narrow identity rail. */}
      <MovieDetailHeader
        movie={movie}
        genres={genres}
        displayDuration={displayDuration}
      />

      {/* Body. Left: identity rail (poster, synopsis, franchises,
          rating) — sticky on wide screens so it stays in view while only
          the technical console on the right scrolls. Right: technical
          console (releases, video, audio, subtitles, file). Below lg it
          collapses to a single column. */}
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,360px)_minmax(0,1fr)] lg:items-start lg:gap-10 xl:grid-cols-[minmax(0,400px)_minmax(0,1fr)] xl:gap-12 2xl:grid-cols-[minmax(0,440px)_minmax(0,1fr)] 2xl:gap-16">
        <div className="detail-reveal detail-reveal--2 space-y-5 lg:sticky lg:top-4 lg:self-start">
          <SpotlightTarget side="left">
            <MovieCoverHero coverUrl={coverUrl} title={movie.title} />
          </SpotlightTarget>

          {movie.description ? (
            <p className="text-sm leading-relaxed text-muted 2xl:text-[0.95rem]">
              {movie.description}
            </p>
          ) : null}

          <MovieFranchises memberships={franchiseMemberships} />

          <MovieRatingWatchedSection
            movieId={movie.id}
            rating={movie.rating}
            watchedAt={movie.watchedAt}
          />

          <MovieBuildJobsPanel
            movieSlug={movie.slug}
            builds={recentBuilds.map(serializeBuild)}
          />
        </div>

        <SpotlightTarget
          side="right"
          className="detail-reveal detail-reveal--3 min-w-0"
        >
          {releaseViews.length > 0 ? (
            <MovieReleasePanel
              movieId={movie.id}
              movieSlug={movie.slug}
              releases={releaseViews}
              initialActiveReleaseId={
                activeReleaseId ?? releaseViews[0].id
              }
            />
          ) : (
            <EmptyReleasesCard movieSlug={movie.slug} />
          )}
        </SpotlightTarget>
      </div>
    </div>
  );
}
