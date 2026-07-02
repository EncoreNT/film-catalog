import { prisma } from "./prisma";
import { releaseInclude } from "./movie-include";

export type DuplicateMovie = {
  id: number;
  slug: string;
  title: string;
  year: number | null;
  status: string;
  _count: { releases: number };
};

/** Find other movies sharing the same matchKey (merge candidates). */
export async function findDuplicateMovies(movie: {
  id: number;
  matchKey: string | null;
}): Promise<DuplicateMovie[]> {
  if (!movie.matchKey) return [];
  return prisma.movie.findMany({
    where: {
      id: { not: movie.id },
      matchKey: movie.matchKey,
      status: { not: "EXCLUDED" },
    },
    select: {
      id: true,
      slug: true,
      title: true,
      year: true,
      status: true,
      _count: { select: { releases: true } },
    },
    orderBy: [{ status: "asc" }, { id: "asc" }],
  });
}

export interface DuplicateGroup {
  matchKey: string;
  movies: DuplicateMovie[];
}

/** All matchKey groups with 2+ non-excluded movies (for /duplicates page). */
export async function findAllDuplicateGroups(): Promise<DuplicateGroup[]> {
  const movies = await prisma.movie.findMany({
    where: {
      matchKey: { not: null },
      status: { not: "EXCLUDED" },
    },
    select: {
      id: true,
      slug: true,
      title: true,
      year: true,
      status: true,
      matchKey: true,
      _count: { select: { releases: true } },
    },
    orderBy: [{ matchKey: "asc" }, { id: "asc" }],
  });

  const groups = new Map<string, DuplicateMovie[]>();
  for (const movie of movies) {
    if (!movie.matchKey) continue;
    const { matchKey, ...rest } = movie;
    const list = groups.get(matchKey) ?? [];
    list.push(rest);
    groups.set(matchKey, list);
  }

  return [...groups.entries()]
    .filter(([, list]) => list.length >= 2)
    .map(([matchKey, list]) => ({ matchKey, movies: list }));
}

/** @deprecated Use findDuplicateMovies */
export async function findAlternativeQualityMovies(movie: {
  id: number;
  title: string;
  year: number | null;
}): Promise<never[]> {
  void movie;
  return [];
}

export { releaseTabLabel as alternativeQualityLabel } from "./spec-tags";

export const releaseDetailInclude = releaseInclude;
