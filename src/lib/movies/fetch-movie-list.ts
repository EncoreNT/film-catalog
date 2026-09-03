import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/db/prisma";
import { movieInclude } from "@/lib/movies/movie-include";
import {
  buildMovieListWhere,
  buildMovieOrder,
  DEFAULT_MOVIE_LIST_LIMIT,
  parseListQuery,
} from "@/lib/movies/movie-query";
import {
  isReleaseAggregateSort,
  releaseAggregateSortSelect,
  sortMovieCandidatesByReleaseAggregate,
} from "@/lib/movies/movie-release-sort";
import {
  isRatingSortOrFilter,
  fetchRatingSortedMovieIds,
} from "@/lib/movies/movie-rating-sort";

function countReleasesForMovies(where: Prisma.MovieWhereInput) {
  return prisma.release.count({ where: { movie: where } });
}

export async function fetchMovieList(
  query: ReturnType<typeof parseListQuery>,
) {
  const where = await buildMovieListWhere(query);
  const page = query.page ?? 1;
  const limit = query.limit ?? DEFAULT_MOVIE_LIST_LIMIT;
  const skip = (page - 1) * limit;

  if (isRatingSortOrFilter(query)) {
    const [{ pageIds, total }, releaseCount] = await Promise.all([
      fetchRatingSortedMovieIds(where, {
        sort: query.sort,
        order: query.order ?? "asc",
        minRating: query.minRating,
        skip,
        take: limit,
      }),
      countReleasesForMovies(where),
    ]);

    if (pageIds.length === 0) {
      return { items: [], total, releaseCount, page, limit };
    }

    const items = await prisma.movie.findMany({
      where: { id: { in: pageIds } },
      include: movieInclude,
    });
    const byId = new Map(items.map((movie) => [movie.id, movie]));

    return {
      items: pageIds
        .map((id) => byId.get(id))
        .filter((movie): movie is NonNullable<typeof movie> => movie != null),
      total,
      releaseCount,
      page,
      limit,
    };
  }

  if (isReleaseAggregateSort(query.sort)) {
    const [candidates, total, releaseCount] = await Promise.all([
      prisma.movie.findMany({
        where,
        select: releaseAggregateSortSelect,
      }),
      prisma.movie.count({ where }),
      countReleasesForMovies(where),
    ]);

    const pageIds = sortMovieCandidatesByReleaseAggregate(
      candidates,
      query.sort,
      query.order ?? "asc",
    ).slice(skip, skip + limit);

    if (pageIds.length === 0) {
      return { items: [], total, releaseCount, page, limit };
    }

    const items = await prisma.movie.findMany({
      where: { id: { in: pageIds } },
      include: movieInclude,
    });
    const byId = new Map(items.map((movie) => [movie.id, movie]));

    return {
      items: pageIds
        .map((id) => byId.get(id))
        .filter((movie): movie is NonNullable<typeof movie> => movie != null),
      total,
      releaseCount,
      page,
      limit,
    };
  }

  const orderBy = buildMovieOrder(query);
  const [items, total, releaseCount] = await Promise.all([
    prisma.movie.findMany({
      where,
      orderBy,
      skip,
      take: limit,
      include: movieInclude,
    }),
    prisma.movie.count({ where }),
    countReleasesForMovies(where),
  ]);

  return { items, total, releaseCount, page, limit };
}
