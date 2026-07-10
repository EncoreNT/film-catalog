import type { Prisma } from "@/generated/prisma/client";

export const RELEASE_AGGREGATE_SORT_FIELDS = [
  "durationSeconds",
  "fileSize",
] as const;

export type ReleaseAggregateSortField =
  (typeof RELEASE_AGGREGATE_SORT_FIELDS)[number];

type ReleaseSortSlice = {
  durationSeconds: number | null;
  fileSize: number | null;
};

type MovieSortCandidate = {
  id: number;
  releases: ReleaseSortSlice[];
};

export function isReleaseAggregateSort(
  sort: string | undefined,
): sort is ReleaseAggregateSortField {
  return RELEASE_AGGREGATE_SORT_FIELDS.includes(
    sort as ReleaseAggregateSortField,
  );
}

/** Longest known release duration; null when no release has duration. */
export function movieDurationSortKey(
  releases: ReleaseSortSlice[],
): number | null {
  let max: number | null = null;
  for (const release of releases) {
    if (release.durationSeconds == null) continue;
    if (max == null || release.durationSeconds > max) {
      max = release.durationSeconds;
    }
  }
  return max;
}

/** Sum of release file sizes; null when every release lacks size. */
export function movieFileSizeSortKey(
  releases: ReleaseSortSlice[],
): number | null {
  let sum = 0;
  let hasValue = false;
  for (const release of releases) {
    if (release.fileSize == null) continue;
    sum += release.fileSize;
    hasValue = true;
  }
  return hasValue ? sum : null;
}

export function releaseAggregateSortKey(
  sort: ReleaseAggregateSortField,
  releases: ReleaseSortSlice[],
): number | null {
  switch (sort) {
    case "durationSeconds":
      return movieDurationSortKey(releases);
    case "fileSize":
      return movieFileSizeSortKey(releases);
  }
}

function compareNullableNumbers(
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

export function sortMovieCandidatesByReleaseAggregate(
  candidates: MovieSortCandidate[],
  sort: ReleaseAggregateSortField,
  order: "asc" | "desc" = "asc",
): number[] {
  return [...candidates]
    .sort((a, b) => {
      const keyA = releaseAggregateSortKey(sort, a.releases);
      const keyB = releaseAggregateSortKey(sort, b.releases);
      const byKey = compareNullableNumbers(keyA, keyB, order);
      if (byKey !== 0) return byKey;
      return order === "asc" ? a.id - b.id : b.id - a.id;
    })
    .map((movie) => movie.id);
}

export const releaseAggregateSortSelect = {
  id: true,
  releases: {
    select: {
      durationSeconds: true,
      fileSize: true,
    },
  },
} satisfies Prisma.MovieSelect;
