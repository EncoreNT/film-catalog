import type { NextRequest } from "next/server";
import { fetchMovieList } from "@/lib/movies/fetch-movie-list";
import { parseListQuery } from "@/lib/movies/movie-query";

export async function listMovies(request: NextRequest) {
  const query = parseListQuery(request.nextUrl.searchParams);
  const { items, page, limit, total } = await fetchMovieList(query);
  return { items, page, limit, total };
}
