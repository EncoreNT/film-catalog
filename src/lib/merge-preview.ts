import { prisma } from "./prisma";
import { releaseInclude } from "./movie-include";
import { movieCoverUrlFromMovie } from "./cover-url";
import { orderedMovieGenres } from "./movie-genres";
import { genreLabel } from "./dictionaries";
import { releaseTabLabel } from "./spec-tags";
import { formatFileSizeGB } from "./format";
import type { ReleaseWithTracks } from "./movie-query";
import type { MergeCandidate, MergeCandidateRelease } from "./merge-preview-types";

export type { MergeCandidate, MergeCandidateRelease } from "./merge-preview-types";

function toMergeCandidateRelease(
  release: ReleaseWithTracks,
): MergeCandidateRelease {
  return {
    id: release.id,
    label: releaseTabLabel(release),
    filePath: release.filePath,
    storageName: release.storage?.name ?? null,
    fileSizeLabel: formatFileSizeGB(release.fileSize),
  };
}

export async function fetchMergeCandidate(
  movieId: number,
): Promise<MergeCandidate | null> {
  const movie = await prisma.movie.findUnique({
    where: { id: movieId },
    include: {
      releases: { include: releaseInclude, orderBy: { createdAt: "asc" } },
      movieGenres: {
        orderBy: { sortOrder: "asc" },
        include: { genre: true },
      },
      slots: {
        include: { franchise: { select: { name: true } } },
      },
    },
  });

  if (!movie) return null;

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
    genres: orderedMovieGenres(movie).map((g) => genreLabel(g.name) ?? g.name),
    franchiseNames: movie.slots.map((s) => s.franchise.name),
    releases: movie.releases.map((r) =>
      toMergeCandidateRelease(r as ReleaseWithTracks),
    ),
  };
}

/** All non-excluded movies sharing matchKey, with merge preview fields. */
export async function fetchMergeCandidatesForGroup(movie: {
  id: number;
  matchKey: string | null;
}): Promise<MergeCandidate[]> {
  if (!movie.matchKey) return [];

  const rows = await prisma.movie.findMany({
    where: {
      matchKey: movie.matchKey,
      status: { not: "EXCLUDED" },
    },
    select: { id: true },
    orderBy: [{ status: "asc" }, { id: "asc" }],
  });

  const candidates = await Promise.all(rows.map((r) => fetchMergeCandidate(r.id)));
  return candidates.filter((c): c is MergeCandidate => c != null);
}
