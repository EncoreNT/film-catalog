import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getMovieRemakeMemberships } from "@/lib/remakes/remake-membership";
import { attachMovieToRemakeGroup } from "@/lib/remakes/attach-movie-to-remake-group";
import { remakeAttachSchema } from "@/lib/api/validators";
import {
  isErrorResponse,
  jsonError,
  parseRouteId,
  type RouteContext,
} from "@/lib/api/api-utils";

export async function GET(_request: NextRequest, context: RouteContext) {
  const movieId = await parseRouteId(context.params);
  if (isErrorResponse(movieId)) return movieId;

  const memberships = await getMovieRemakeMemberships(prisma, movieId);
  return NextResponse.json(memberships);
}

export async function POST(request: NextRequest, context: RouteContext) {
  const movieId = await parseRouteId(context.params);
  if (isErrorResponse(movieId)) return movieId;

  try {
    const body = await request.json();
    const data = remakeAttachSchema.parse(body);
    const memberships = await attachMovieToRemakeGroup(movieId, data);
    return NextResponse.json(memberships);
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Не удалось добавить в группу ремейков";
    return jsonError(message, 400);
  }
}
