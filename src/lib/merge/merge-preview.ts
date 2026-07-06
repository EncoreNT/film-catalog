import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/db/prisma";
import { releaseInclude } from "@/lib/movies/movie-include";
import { movieCoverUrlFromMovie } from "@/lib/covers/cover-url";
import { orderedMovieGenres } from "@/lib/movies/movie-genres";
import { displayGenreName } from "@/lib/shared/dictionaries";
import { releaseTabLabel } from "@/lib/media/spec-tags";
import { formatFileSizeGB } from "@/lib/shared/format";
import type { ReleaseWithTracks } from "@/lib/movies/movie-include";
import { sortReleasesByQuality } from "@/lib/releases/release-primary";
import type { MergeCandidate, MergeCandidateRelease } from "@/lib/merge/merge-preview-types";

export type { MergeCandidate, MergeCandidateRelease } from "@/lib/merge/merge-preview-types";

/**
 * Prisma include for merge preview cards.
 * Slots are included so franchiseNames can list every franchise the movie belongs to
 * (a movie may appear in multiple franchises via FranchiseSlot).
 */
export const mergeCandidateInclude = {
  releases: { include: releaseInclude, orderBy: { createdAt: "asc" as const } },
  movieGenres: {
    orderBy: { sortOrder: "asc" as const },
    include: { genre: true },
  },
  slots: {
    include: { franchise: { select: { name: true } } },
  },
} as const;

function toMergeCandidateRelease(
  release: ReleaseWithTracks,
): MergeCandidateRelease {
  return {
    id: release.id,
    label: releaseTabLabel(release),
    filePath: release.filePath,
    storageName: release.externalStorage?.name ?? null,
    fileSizeLabel: formatFileSizeGB(release.fileSize),
  };
}

type MergeCandidateMovie = Prisma.MovieGetPayload<{
  include: typeof mergeCandidateInclude;
}>;

function toMergeCandidate(movie: MergeCandidateMovie): MergeCandidate {
  return {
    id: movie.id,
    slug: movie.slug,
    title: movie.title,
    year: movie.year,
    status: movie.status,
    rating: movie.rating,
    watchedAt: movie.watchedAt?.toISOString() ?? null,
    coverUrl: movieCoverUrlFromMovie(movie),
    description: movie.description,
    genres: orderedMovieGenres(movie).map((g) => displayGenreName(g.name)),
    franchiseNames: movie.slots.map((s) => s.franchise.name),
    releases: sortReleasesByQuality(movie.releases as ReleaseWithTracks[]).map(
      (r) => toMergeCandidateRelease(r),
    ),
  };
}

export async function fetchMergeCandidate(
  movieId: number,
): Promise<MergeCandidate | null> {
  const movie = await prisma.movie.findUnique({
    where: { id: movieId },
    include: mergeCandidateInclude,
  });

  if (!movie) return null;

  return toMergeCandidate(movie);
}

/** All non-excluded movies sharing matchKey, with merge preview fields. */
export async function fetchMergeCandidatesForGroup(movie: {
  id: number;
  matchKey: string | null;
}): Promise<MergeCandidate[]> {
  if (!movie.matchKey) return [];

  const movies = await prisma.movie.findMany({
    where: {
      matchKey: movie.matchKey,
      status: { not: "EXCLUDED" },
    },
    include: mergeCandidateInclude,
    orderBy: [{ status: "asc" }, { id: "asc" }],
  });

  return movies.map(toMergeCandidate);
}
