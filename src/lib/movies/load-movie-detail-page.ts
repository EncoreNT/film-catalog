import { prisma } from "@/lib/db/prisma";
import { fetchMergeCandidatesForGroup } from "@/lib/merge/merge-preview";
import { loadMovieBySlug } from "@/lib/movies/load-movie-by-slug";
import { getMovieFranchiseMemberships } from "@/lib/movies/movie-franchise-memberships";
import { orderedMovieGenres } from "@/lib/movies/movie-genres";
import { movieCoverUrlFromMovie } from "@/lib/covers/cover-url";
import { resolveActiveRelease } from "@/lib/releases/resolve-active-release";
import { buildReleaseDetailViews } from "@/lib/releases/release-detail-view";
import type { ReleaseWithTracks } from "@/lib/movies/movie-include";

export interface MovieDetailFranchiseMembershipView {
  id: number;
  franchise: {
    id: number;
    name: string;
    slug: string;
  };
}

export async function loadMovieDetailPage(
  slug: string,
  releaseIdParam: number | null,
) {
  const movie = await loadMovieBySlug(slug);
  if (!movie) return null;

  const releases = movie.releases as ReleaseWithTracks[];
  const activeRelease = resolveActiveRelease(releases, releaseIdParam);

  const memberships = await getMovieFranchiseMemberships(prisma, movie.id);
  const franchiseMemberships: MovieDetailFranchiseMembershipView[] = memberships.map(
    (m) => ({
      id: m.slotId,
      franchise: {
        id: m.franchiseId,
        name: m.franchiseName,
        slug: m.franchiseSlug,
      },
    }),
  );

  const mergeCandidates = await fetchMergeCandidatesForGroup(movie);
  const coverUrl = movieCoverUrlFromMovie(movie);
  const genres = orderedMovieGenres(movie);
  const releaseViews = buildReleaseDetailViews(releases);
  const displayDuration =
    activeRelease?.durationSeconds ?? releases[0]?.durationSeconds ?? null;

  return {
    movie,
    mergeCandidates,
    coverUrl,
    genres,
    releaseViews,
    displayDuration,
    franchiseMemberships,
    activeReleaseId: activeRelease?.id ?? releaseViews[0]?.id ?? null,
  };
}
