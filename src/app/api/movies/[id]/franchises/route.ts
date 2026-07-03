import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getMovieFranchiseMemberships } from "@/lib/movies/movie-franchise-memberships";
import { attachMovieToFranchise } from "@/lib/franchises/attach-movie";
import { movieFranchiseAttachSchema } from "@/lib/api/validators";
import {
  isErrorResponse,
  jsonError,
  parseRouteId,
  type RouteContext,
} from "@/lib/api/api-utils";

export async function GET(_request: NextRequest, context: RouteContext) {
  const movieId = await parseRouteId(context.params);
  if (isErrorResponse(movieId)) return movieId;

  const memberships = await getMovieFranchiseMemberships(prisma, movieId);
  return NextResponse.json(memberships);
}

export async function POST(request: NextRequest, context: RouteContext) {
  const movieId = await parseRouteId(context.params);
  if (isErrorResponse(movieId)) return movieId;

  try {
    const body = await request.json();
    const data = movieFranchiseAttachSchema.parse(body);
    const memberships = await attachMovieToFranchise(movieId, data);
    return NextResponse.json(memberships);
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Не удалось добавить франшизу";
    return jsonError(message, 400);
  }
}
