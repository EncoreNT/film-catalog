import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/db/prisma";
import { computeAverageRating } from "@/lib/movies/movie-rating";

export function isRatingSortOrFilter(query: {
  sort?: string;
  minRating?: number;
}): boolean {
  return query.sort === "rating" || query.minRating != null;
}

type RatingCandidate = {
  id: number;
  ratings: { rating: number }[];
};

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

export function sortMovieCandidatesByRating(
  candidates: RatingCandidate[],
  order: "asc" | "desc" = "asc",
): number[] {
  return [...candidates]
    .sort((a, b) => {
      const keyA = computeAverageRating(a.ratings);
      const keyB = computeAverageRating(b.ratings);
      const byKey = compareNullableNumbers(keyA, keyB, order);
      if (byKey !== 0) return byKey;
      return order === "asc" ? a.id - b.id : b.id - a.id;
    })
    .map((movie) => movie.id);
}

export function filterCandidatesByMinRating(
  candidates: RatingCandidate[],
  minRating: number,
): number[] {
  return candidates
    .filter((candidate) => {
      const avg = computeAverageRating(candidate.ratings);
      return avg != null && avg >= minRating;
    })
    .map((candidate) => candidate.id);
}

export const ratingSortSelect = {
  id: true,
  movieRatings: {
    select: { rating: true },
  },
} satisfies Prisma.MovieSelect;

export async function fetchRatingSortedMovieIds(
  baseWhere: Prisma.MovieWhereInput,
  options: {
    sort?: string;
    order?: "asc" | "desc";
    minRating?: number;
    skip: number;
    take: number;
  },
): Promise<{ pageIds: number[]; total: number }> {
  const candidates = await prisma.movie.findMany({
    where: baseWhere,
    select: ratingSortSelect,
  });

  const ratingCandidates = candidates.map((candidate) => ({
    id: candidate.id,
    ratings: candidate.movieRatings,
  }));

  let ids: number[];
  if (options.sort === "rating") {
    ids = sortMovieCandidatesByRating(ratingCandidates, options.order ?? "asc");
  } else {
    ids = ratingCandidates.map((c) => c.id).sort((a, b) => a - b);
  }

  if (options.minRating != null) {
    const allowed = new Set(
      filterCandidatesByMinRating(ratingCandidates, options.minRating),
    );
    ids = ids.filter((id) => allowed.has(id));
  }

  const total = ids.length;
  const pageIds = ids.slice(options.skip, options.skip + options.take);
  return { pageIds, total };
}
