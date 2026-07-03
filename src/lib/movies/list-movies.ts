import type { NextRequest } from "next/server";
import { prisma } from "@/lib/db/prisma";
import {
  buildMovieListWhere,
  buildMovieOrder,
  parseListQuery,
} from "@/lib/movies/movie-query";
import { movieInclude } from "@/lib/movies/movie-include";

export async function listMovies(request: NextRequest) {
  const query = parseListQuery(request.nextUrl.searchParams);
  const where = await buildMovieListWhere(query);
  const orderBy = buildMovieOrder(query);
  const page = query.page ?? 1;
  const limit = query.limit ?? 48;
  const skip = (page - 1) * limit;

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

  return { items, page, limit, total };
}
