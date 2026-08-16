import { NextRequest, NextResponse } from "next/server";
import {
  movieRatingClearSchema,
  movieRatingSetSchema,
} from "@/lib/api/validators";
import {
  clearMovieRating,
  setMovieRating,
} from "@/lib/movies/update-movie-rating";
import {
  isErrorResponse,
  mapDomainError,
  parseRequestBody,
  parseRouteId,
  type RouteContext,
} from "@/lib/api/api-utils";

export async function PUT(request: NextRequest, context: RouteContext) {
  const movieId = await parseRouteId(context.params);
  if (isErrorResponse(movieId)) return movieId;

  const data = await parseRequestBody(request, movieRatingSetSchema);
  if (isErrorResponse(data)) return data;

  try {
    const movie = await setMovieRating(movieId, data.raterId, data.rating);
    return NextResponse.json(movie);
  } catch (err) {
    return mapDomainError(err, "Не удалось сохранить оценку");
  }
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  const movieId = await parseRouteId(context.params);
  if (isErrorResponse(movieId)) return movieId;

  const data = await parseRequestBody(request, movieRatingClearSchema);
  if (isErrorResponse(data)) return data;

  try {
    const movie = await clearMovieRating(movieId, data.raterId);
    return NextResponse.json(movie);
  } catch (err) {
    return mapDomainError(err, "Не удалось удалить оценку");
  }
}
