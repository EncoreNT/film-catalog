import { prisma } from "@/lib/db/prisma";
import { movieInclude } from "@/lib/movies/movie-include";
import {
  buildMovieListWhere,
  buildMovieOrder,
  parseListQuery,
} from "@/lib/movies/movie-query";
import {
  isReleaseAggregateSort,
  releaseAggregateSortSelect,
  sortMovieCandidatesByReleaseAggregate,
} from "@/lib/movies/movie-release-sort";

export async function fetchMovieList(
  query: ReturnType<typeof parseListQuery>,
) {
  const where = await buildMovieListWhere(query);
  const page = query.page ?? 1;
  const limit = query.limit ?? 48;
  const skip = (page - 1) * limit;

  if (isReleaseAggregateSort(query.sort)) {
    const [candidates, total] = await Promise.all([
      prisma.movie.findMany({
        where,
        select: releaseAggregateSortSelect,
      }),
      prisma.movie.count({ where }),
    ]);

    const pageIds = sortMovieCandidatesByReleaseAggregate(
      candidates,
      query.sort,
      query.order ?? "asc",
    ).slice(skip, skip + limit);

    if (pageIds.length === 0) {
      return { items: [], total, page, limit };
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
      page,
      limit,
    };
  }

  const orderBy = buildMovieOrder(query);
  const [items, total] = await Promise.all([
    prisma.movie.findMany({
      where,
      orderBy,
      skip,
      take: limit,
      include: movieInclude,
    }),
    prisma.movie.count({ where }),
  ]);

  return { items, total, page, limit };
}
