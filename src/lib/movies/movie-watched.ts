import type { Prisma } from "@/generated/prisma/client";

/** Просмотрен = есть дата просмотра или хотя бы одна оценка. */
export function isMovieWatched(
  watchedAt: Date | null | undefined,
  ratingCount: number,
): boolean {
  return watchedAt != null || ratingCount > 0;
}

export const movieIsWatchedWhere: Prisma.MovieWhereInput = {
  OR: [{ watchedAt: { not: null } }, { movieRatings: { some: {} } }],
};

export const movieIsUnwatchedWhere: Prisma.MovieWhereInput = {
  AND: [{ watchedAt: null }, { movieRatings: { none: {} } }],
};

export function buildMovieWatchedFilter(input: {
  watched: "watched" | "unwatched";
  watchedFrom?: string;
  watchedTo?: string;
}): Prisma.MovieWhereInput {
  const hasWatchedRange = Boolean(input.watchedFrom || input.watchedTo);

  if (input.watched === "unwatched") {
    if (hasWatchedRange) {
      return { id: -1 };
    }
    return movieIsUnwatchedWhere;
  }

  if (hasWatchedRange) {
    return {
      watchedAt: {
        not: null,
        ...(input.watchedFrom ? { gte: new Date(input.watchedFrom) } : {}),
        ...(input.watchedTo ? { lte: new Date(input.watchedTo) } : {}),
      },
    };
  }

  return movieIsWatchedWhere;
}
