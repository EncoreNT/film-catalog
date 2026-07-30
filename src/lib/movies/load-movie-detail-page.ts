import { prisma } from "@/lib/db/prisma";
import { fetchMergeCandidatesForGroup } from "@/lib/merge/merge-preview";
import { loadMovieBySlug } from "@/lib/movies/load-movie-by-slug";
import { getMovieFranchiseMemberships } from "@/lib/movies/movie-franchise-memberships";
import { getMovieRemakeMemberships } from "@/lib/remakes/remake-membership";
import { orderedMovieGenres } from "@/lib/movies/movie-genres";
import { movieCoverUrlFromMovie } from "@/lib/covers/cover-url";
import { resolveActiveRelease } from "@/lib/releases/resolve-active-release";
import { buildReleaseDetailViews } from "@/lib/releases/release-detail-view";
import {
  buildPartReleaseGroups,
  type ReleasePartGroup,
} from "@/lib/movies/build-part-release-groups";
import { detailDisplayDurationSeconds } from "@/lib/movies/multipart-duration";
import {
  pickPrimaryRelease,
  sortReleasesByQuality,
} from "@/lib/releases/release-primary";
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

  const releases = sortReleasesByQuality(movie.releases as ReleaseWithTracks[]);
  const activeRelease = resolveActiveRelease(
    releases,
    releaseIdParam,
    movie.primaryReleaseId,
  );

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

  const remakeMemberships = await getMovieRemakeMemberships(prisma, movie.id);

  const mergeCandidates = await fetchMergeCandidatesForGroup(movie);
  const coverUrl = movieCoverUrlFromMovie(movie);
  const genres = orderedMovieGenres(movie);
  const releaseViews = buildReleaseDetailViews(releases);
  const partReleaseGroups = buildPartReleaseGroups(movie, releaseViews);
  const catalogPrimaryReleaseId =
    pickPrimaryRelease(releases, movie.primaryReleaseId)?.id ?? null;
  const displayDuration = detailDisplayDurationSeconds(
    releases,
    movie.partCount,
    activeRelease,
  );

  return {
    movie,
    mergeCandidates,
    coverUrl,
    genres,
    releaseViews,
    partReleaseGroups,
    displayDuration,
    franchiseMemberships,
    remakeMemberships,
    activeReleaseId: activeRelease?.id ?? releaseViews[0]?.id ?? null,
    catalogPrimaryReleaseId,
  };
}
