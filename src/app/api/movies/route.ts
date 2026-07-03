import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import {
  buildMovieListWhere,
  buildMovieOrder,
  parseListQuery,
} from "@/lib/movies/movie-query";
import { movieCreateSchema } from "@/lib/api/validators";
import { movieInclude } from "@/lib/movies/movie-include";
import { createMovie, probeOnlyMovie } from "@/lib/movies/create-movie";
import { loadMovieFileMeta } from "@/lib/releases/load-movie-file-meta";
import { jsonError } from "@/lib/api/api-utils";

export async function GET(request: NextRequest) {
  const query = parseListQuery(request.nextUrl.searchParams);
  const where = await buildMovieListWhere(query);
  const orderBy = buildMovieOrder(query);
  const page = query.page ?? 1;
  const limit = query.limit ?? 48;
  const skip = (page - 1) * limit;

  const [movies, total] = await Promise.all([
    prisma.movie.findMany({ where, orderBy, skip, take: limit, include: movieInclude }),
    prisma.movie.count({ where }),
  ]);

  return NextResponse.json({
    movies,
    pagination: { page, limit, total, pages: Math.ceil(total / limit) },
  });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const data = movieCreateSchema.parse(body);

    if (data.probeOnly) {
      try {
        const result = await probeOnlyMovie(data);
        return NextResponse.json(result);
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Не удалось проанализировать файл";
        const status = message.includes("не найден") ? 404 : 400;
        return jsonError(message, status);
      }
    }

    const result = await createMovie(data);
    return NextResponse.json(result, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Create failed";
    return jsonError(message, 400);
  }
}

export async function HEAD(request: NextRequest) {
  const filePath = request.nextUrl.searchParams.get("path");
  if (!filePath) {
    return new NextResponse(null, { status: 400 });
  }
  try {
    const { assertMovieFileReadable } = await loadMovieFileMeta();
    await assertMovieFileReadable(filePath);
    return new NextResponse(null, { status: 200 });
  } catch {
    return new NextResponse(null, { status: 404 });
  }
}
