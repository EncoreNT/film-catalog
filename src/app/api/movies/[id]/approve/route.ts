import { NextRequest, NextResponse } from "next/server";
import { approveMovie as approveMovieCommand } from "@/lib/movies/approve-movie";
import {
  isErrorResponse,
  parseRouteId,
  type RouteContext,
} from "@/lib/api/api-utils";

export async function POST(_request: NextRequest, context: RouteContext) {
  const movieId = await parseRouteId(context.params);
  if (isErrorResponse(movieId)) return movieId;

  const movie = await approveMovieCommand(movieId);
  return NextResponse.json(movie);
}
