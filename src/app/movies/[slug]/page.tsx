import { notFound } from "next/navigation";
import { BackLink } from "@/components/primitives/BackLink";
import { MovieReleasePanel } from "@/components/releases/MovieReleasePanel";
import { DuplicateMergeBanner } from "@/components/movies/DuplicateMergeBanner";
import { MovieCoverHero } from "@/components/movies/MovieCoverHero";
import { MovieDetailHeader } from "@/components/movies/MovieDetailHeader";
import { MovieFranchises } from "@/components/movies/MovieFranchises";
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
    <div className="space-y-8 xl:space-y-10 2xl:space-y-12">
      <BackLink href="/">Назад к каталогу</BackLink>

      {mergeCandidates.length > 1 ? (
        <DuplicateMergeBanner
          currentMovieId={movie.id}
          candidates={mergeCandidates}
        />
      ) : null}

      {/* Title band — full width and compact so the technical console sits
          high on the page, right where the user wants video/audio. */}
      <div className="detail-reveal">
        <MovieDetailHeader
          movie={movie}
          genres={genres}
          displayDuration={displayDuration}
        />
      </div>

      {/* Body. Left: framed poster, synopsis and franchise tags — this
          whole identity column is sticky on wide screens so it stays in
          view while only the technical console on the right scrolls.
          Right: the technical console (releases, video, audio, subtitles,
          file). The column is wide enough for a comfortable synopsis
          measure and the gap to the console is generous. Below lg it
          collapses to a single column. */}
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-[320px_minmax(0,1fr)] lg:items-start lg:gap-10 xl:grid-cols-[380px_minmax(0,1fr)] xl:gap-12 2xl:grid-cols-[420px_minmax(0,1fr)] 2xl:gap-16">
        <div className="detail-reveal detail-reveal--2 space-y-6 lg:space-y-7 lg:sticky lg:top-6 lg:self-start">
          <MovieCoverHero coverUrl={coverUrl} title={movie.title} />

          {movie.description ? (
            <div className="rounded-[var(--radius-sm)] border border-border/60 bg-bg-elevated/40 p-4 2xl:p-5">
              <p className="text-sm leading-relaxed text-muted 2xl:text-[0.95rem]">
                {movie.description}
              </p>
            </div>
          ) : null}

          <MovieFranchises memberships={franchiseMemberships} />
        </div>

        <div className="detail-reveal detail-reveal--3 min-w-0">
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
        </div>
      </div>

      {/* Rating + watched — the least important information, so it lives
          last, full width at the very bottom of the page. */}
      <MovieRatingWatchedSection
        movieId={movie.id}
        rating={movie.rating}
        watchedAt={movie.watchedAt}
      />
    </div>
  );
}
