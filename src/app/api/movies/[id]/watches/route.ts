import { NextRequest, NextResponse } from "next/server";
import { movieWatchLogSchema } from "@/lib/api/validators";
import { recordMovieWatch } from "@/lib/movies/movie-watch";
import {
  isErrorResponse,
  mapDomainError,
  parseRequestBody,
  parseRouteId,
  type RouteContext,
} from "@/lib/api/api-utils";

export async function POST(request: NextRequest, context: RouteContext) {
  const movieId = await parseRouteId(context.params);
  if (isErrorResponse(movieId)) return movieId;

  const data = await parseRequestBody(request, movieWatchLogSchema);
  if (isErrorResponse(data)) return data;

  try {
    const result = await recordMovieWatch(movieId, data.watchedOn);
    return NextResponse.json(result);
  } catch (err) {
    return mapDomainError(err, "Не удалось записать просмотр");
  }
}
