import { NextRequest, NextResponse } from "next/server";
import { movieUpdateSchema } from "@/lib/api/validators";
import { updateMovie } from "@/lib/movies/update-movie";
import { deleteMovie } from "@/lib/movies/delete-movie";
import {
  isErrorResponse,
  mapDomainError,
  parseRequestBody,
  parseRouteId,
  type RouteContext,
} from "@/lib/api/api-utils";

export async function PATCH(request: NextRequest, context: RouteContext) {
  const movieId = await parseRouteId(context.params);
  if (isErrorResponse(movieId)) return movieId;

  const data = await parseRequestBody(request, movieUpdateSchema);
  if (isErrorResponse(data)) return data;

  try {
    const movie = await updateMovie(movieId, data);
    return NextResponse.json(movie);
  } catch (err) {
    return mapDomainError(err, "Не удалось обновить фильм");
  }
}

export async function DELETE(_request: NextRequest, context: RouteContext) {
  const movieId = await parseRouteId(context.params);
  if (isErrorResponse(movieId)) return movieId;

  await deleteMovie(movieId);
  return NextResponse.json({ ok: true });
}
