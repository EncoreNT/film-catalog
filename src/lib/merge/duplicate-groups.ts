import { prisma } from "@/lib/db/prisma";

export type DuplicateMovie = {
  id: number;
  slug: string;
  title: string;
  year: number | null;
  status: string;
  _count: { releases: number };
};

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
