import { NextRequest, NextResponse } from "next/server";
import { mergeSchema } from "@/lib/validators";
import { mergeMovies } from "@/lib/movie-merge";
import {
  isErrorResponse,
  jsonError,
  parseRouteId,
  type RouteContext,
} from "@/lib/api-utils";

export async function POST(request: NextRequest, context: RouteContext) {
  const movieId = await parseRouteId(context.params);
  if (isErrorResponse(movieId)) return movieId;

  try {
    const body = await request.json();
    const { otherId, choices } = mergeSchema.parse(body);

    const movie = await mergeMovies(movieId, otherId, choices ?? {});
    return NextResponse.json(movie);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Не удалось объединить фильмы";
    return jsonError(message, 400);
  }
}
