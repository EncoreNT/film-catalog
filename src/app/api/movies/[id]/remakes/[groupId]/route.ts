import { NextRequest, NextResponse } from "next/server";
import {
  detachMovieFromRemakeGroup,
  updateMovieRemakeRole,
} from "@/lib/remakes/attach-movie-to-remake-group";
import { remakeRoleUpdateSchema } from "@/lib/api/validators";
import {
  isErrorResponse,
  jsonError,
  parseMovieRemakeIds,
  type MovieRemakeRouteContext,
} from "@/lib/api/api-utils";

export async function PATCH(
  request: NextRequest,
  context: MovieRemakeRouteContext,
) {
  const ids = await parseMovieRemakeIds(context.params);
  if (isErrorResponse(ids)) return ids;

  try {
    const body = await request.json();
    const { role } = remakeRoleUpdateSchema.parse(body);
    const memberships = await updateMovieRemakeRole(
      ids.movieId,
      ids.groupId,
      role,
    );
    return NextResponse.json(memberships);
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Не удалось обновить роль";
    return jsonError(message, 400);
  }
}

export async function DELETE(
  _request: NextRequest,
  context: MovieRemakeRouteContext,
) {
  const ids = await parseMovieRemakeIds(context.params);
  if (isErrorResponse(ids)) return ids;

  try {
    const memberships = await detachMovieFromRemakeGroup(
      ids.movieId,
      ids.groupId,
    );
    return NextResponse.json(memberships);
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Не удалось открепить фильм";
    return jsonError(message, 400);
  }
}
