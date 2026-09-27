import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/db/prisma";

export function isWatchDateSort(sort: string | undefined): boolean {
  return sort === "watchedAt";
}

type WatchSortCandidate = {
  id: number;
  lastWatchedOn: Date | null;
};

/** Null last-view dates sort last, same as rating sort. */
function compareNullableTimes(
  a: number | null,
  b: number | null,
  order: "asc" | "desc",
): number {
  if (a == null && b == null) return 0;
  if (a == null) return 1;
  if (b == null) return -1;
  const diff = a - b;
  return order === "asc" ? diff : -diff;
}

export function sortMovieIdsByLastWatch(
  candidates: WatchSortCandidate[],
  order: "asc" | "desc" = "asc",
): number[] {
  return [...candidates]
    .sort((a, b) => {
      const byKey = compareNullableTimes(
        a.lastWatchedOn?.getTime() ?? null,
        b.lastWatchedOn?.getTime() ?? null,
        order,
      );
      if (byKey !== 0) return byKey;
      return order === "asc" ? a.id - b.id : b.id - a.id;
    })
    .map((movie) => movie.id);
}

const watchSortSelect = {
  id: true,
  watches: {
    select: { watchedOn: true },
    orderBy: { watchedOn: "desc" as const },
    take: 1,
  },
} satisfies Prisma.MovieSelect;

export async function fetchWatchSortedMovieIds(
  where: Prisma.MovieWhereInput,
  options: { order?: "asc" | "desc"; skip: number; take: number },
): Promise<{ pageIds: number[]; total: number }> {
  const candidates = await prisma.movie.findMany({
    where,
    select: watchSortSelect,
  });
  const ordered = sortMovieIdsByLastWatch(
    candidates.map((candidate) => ({
      id: candidate.id,
      lastWatchedOn: candidate.watches[0]?.watchedOn ?? null,
    })),
    options.order ?? "asc",
  );
  return {
    pageIds: ordered.slice(options.skip, options.skip + options.take),
    total: ordered.length,
  };
}
