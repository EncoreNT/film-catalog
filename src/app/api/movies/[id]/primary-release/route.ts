import { NextRequest, NextResponse } from "next/server";
import {
  setMoviePrimaryRelease,
  setPrimaryReleaseSchema,
} from "@/lib/movies/set-primary-release";
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

  const data = await parseRequestBody(request, setPrimaryReleaseSchema);
  if (isErrorResponse(data)) return data;

  try {
    const movie = await setMoviePrimaryRelease(movieId, data.releaseId);
    return NextResponse.json(movie);
  } catch (err) {
    return mapDomainError(err, "Не удалось назначить основной релиз");
  }
}
