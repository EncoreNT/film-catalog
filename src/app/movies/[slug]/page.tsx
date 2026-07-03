import { prisma } from "@/lib/db/prisma";
import { fetchMergeCandidatesForGroup } from "@/lib/merge/merge-preview";
import { BackLink } from "@/components/primitives/BackLink";
import { MovieReleasePanel } from "@/components/releases/MovieReleasePanel";
import { DuplicateMergeBanner } from "@/components/movies/DuplicateMergeBanner";
import { MovieCoverHero } from "@/components/movies/MovieCoverHero";
import { MovieDetailHeader } from "@/components/movies/MovieDetailHeader";
import { MovieRatingWatchedSection } from "@/components/movies/MovieRatingWatchedSection";
import { EmptyReleasesCard } from "@/components/movies/EmptyReleasesCard";
import { loadMovieBySlug } from "@/lib/movies/load-movie-by-slug";
import { orderedMovieGenres } from "@/lib/movies/movie-genres";
import { movieCoverUrlFromMovie } from "@/lib/covers/cover-url";
import { resolveActiveRelease } from "@/lib/releases/resolve-active-release";
import { buildReleaseDetailViews } from "@/lib/releases/release-detail-view";
import type { ReleaseWithTracks } from "@/lib/movies/movie-query";

interface PageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ release?: string }>;
}

export default async function MoviePage({ params, searchParams }: PageProps) {
  const { slug } = await params;
  const resolvedSearch = await searchParams;

  const movie = await loadMovieBySlug(slug);

  const releases = movie.releases as ReleaseWithTracks[];
  const releaseIdParam = resolvedSearch.release
    ? Number(resolvedSearch.release)
    : null;
  const activeRelease = resolveActiveRelease(releases, releaseIdParam);

  const franchiseMemberships = await prisma.franchiseSlot.findMany({
    where: { movieId: movie.id },
    include: { franchise: { select: { id: true, name: true, slug: true } } },
  });

  const mergeCandidates = await fetchMergeCandidatesForGroup(movie);

  const coverUrl = movieCoverUrlFromMovie(movie);
  const genres = orderedMovieGenres(movie);
  const releaseViews = buildReleaseDetailViews(releases);
  const displayDuration =
    activeRelease?.durationSeconds ?? releases[0]?.durationSeconds ?? null;

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
              initialActiveReleaseId={activeRelease?.id ?? releaseViews[0].id}
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
