import type { Prisma } from "@/generated/prisma/client";

/** Просмотрен = есть день в журнале или хотя бы одна оценка. */
export function isMovieWatched(
  lastWatchedOn: Date | null | undefined,
  ratingCount: number,
): boolean {
  return lastWatchedOn != null || ratingCount > 0;
}

export const movieIsWatchedWhere: Prisma.MovieWhereInput = {
  OR: [{ watches: { some: {} } }, { movieRatings: { some: {} } }],
};

export const movieIsUnwatchedWhere: Prisma.MovieWhereInput = {
  AND: [{ watches: { none: {} } }, { movieRatings: { none: {} } }],
};

/** Last journal day falls in the range. `some >= from` is the latest day; `none > to` caps it. */
export function latestWatchRangeWhere(input: {
  watchedFrom?: string;
  watchedTo?: string;
}): Prisma.MovieWhereInput {
  const watchedOn: Prisma.DateTimeFilter = {
    ...(input.watchedFrom ? { gte: new Date(input.watchedFrom) } : {}),
    ...(input.watchedTo ? { lte: new Date(input.watchedTo) } : {}),
  };
  const inRange: Prisma.MovieWhereInput = {
    watches: { some: { watchedOn } },
  };
  if (!input.watchedTo) return inRange;
  return {
    AND: [
      inRange,
      {
        watches: {
          none: { watchedOn: { gt: new Date(input.watchedTo) } },
        },
      },
    ],
  };
}

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
    return latestWatchRangeWhere(input);
  }

  return movieIsWatchedWhere;
}
