import { NextRequest, NextResponse } from "next/server";
import { movieWatchLogSchema } from "@/lib/api/validators";
import { moveMovieWatch } from "@/lib/movies/movie-watch";
import {
  isErrorResponse,
  mapDomainError,
  parseMovieWatchIds,
  parseRequestBody,
  type MovieWatchRouteContext,
} from "@/lib/api/api-utils";

export async function PATCH(request: NextRequest, context: MovieWatchRouteContext) {
  const ids = await parseMovieWatchIds(context.params);
  if (isErrorResponse(ids)) return ids;

  const data = await parseRequestBody(request, movieWatchLogSchema);
  if (isErrorResponse(data)) return data;

  try {
    const result = await moveMovieWatch(ids.movieId, ids.watchId, data.watchedOn);
    return NextResponse.json(result);
  } catch (err) {
    return mapDomainError(err, "Не удалось изменить дату просмотра");
  }
}
