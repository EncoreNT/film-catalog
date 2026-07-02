import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { movieUpdateSchema } from "@/lib/validators";
import { movieInclude } from "@/lib/movie-include";
import { syncMovieGenres } from "@/lib/genres";
import { resolveMovieSlug } from "@/lib/movie-slug";
import { computeMatchKey } from "@/lib/movie-match-key";
import {
  isErrorResponse,
  jsonError,
  parseRouteId,
  type RouteContext,
} from "@/lib/api-utils";

export async function PATCH(request: NextRequest, context: RouteContext) {
  const movieId = await parseRouteId(context.params);
  if (isErrorResponse(movieId)) return movieId;

  try {
    const body = await request.json();
    const data = movieUpdateSchema.parse(body);
    const { genres, watchedAt, ...movieData } = data;
    const genreNames = genres ?? null;

    const existing = await prisma.movie.findUnique({
      where: { id: movieId },
      select: { title: true, year: true },
    });
    if (!existing) return jsonError("Фильм не найден", 404);

    const nextTitle = movieData.title ?? existing.title;
    const nextYear =
      movieData.year !== undefined ? movieData.year : existing.year;
    const matchKey = computeMatchKey(nextTitle, nextYear);

    const movie = await prisma.$transaction(async (tx) => {
      const slug =
        movieData.title !== undefined
          ? await resolveMovieSlug(tx, movieData.title, movieId)
          : undefined;

      await tx.movie.update({
        where: { id: movieId },
        data: {
          ...movieData,
          slug,
          matchKey,
          watchedAt:
            watchedAt === undefined
              ? undefined
              : watchedAt
                ? new Date(watchedAt)
                : null,
        },
      });

      if (genreNames !== null) {
        await syncMovieGenres(tx, movieId, genreNames);
      }

      return tx.movie.findUnique({
        where: { id: movieId },
        include: movieInclude,
      });
    });

    return NextResponse.json(movie);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Не удалось обновить фильм";
    return jsonError(message, 400);
  }
}

export async function DELETE(_request: NextRequest, context: RouteContext) {
  const movieId = await parseRouteId(context.params);
  if (isErrorResponse(movieId)) return movieId;

  await prisma.movie.delete({ where: { id: movieId } });
  return NextResponse.json({ ok: true });
}
