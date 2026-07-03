import { NextRequest, NextResponse } from "next/server";
import { movieUpdateSchema } from "@/lib/api/validators";
import { updateMovie } from "@/lib/movies/update-movie";
import { prisma } from "@/lib/db/prisma";
import {
  isErrorResponse,
  jsonError,
  parseRouteId,
  type RouteContext,
} from "@/lib/api/api-utils";

export async function PATCH(request: NextRequest, context: RouteContext) {
  const movieId = await parseRouteId(context.params);
  if (isErrorResponse(movieId)) return movieId;

  try {
    const body = await request.json();
    const data = movieUpdateSchema.parse(body);
    const movie = await updateMovie(movieId, data);
    return NextResponse.json(movie);
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Не удалось обновить фильм";
    const status = message === "Фильм не найден" ? 404 : 400;
    return jsonError(message, status);
  }
}

export async function DELETE(_request: NextRequest, context: RouteContext) {
  const movieId = await parseRouteId(context.params);
  if (isErrorResponse(movieId)) return movieId;

  await prisma.movie.delete({ where: { id: movieId } });
  return NextResponse.json({ ok: true });
}
