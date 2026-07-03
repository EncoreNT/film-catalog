import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { releaseUpdateSchema } from "@/lib/api/validators";
import { releaseInclude } from "@/lib/movies/movie-include";
import { updateReleaseWithTracks } from "@/lib/releases/release-api";
import { deleteRelease } from "@/lib/releases/delete-release";
import { findReleaseForMovie } from "@/lib/releases/probe-release";
import {
  isErrorResponse,
  jsonError,
  mapDomainError,
  parseReleaseId,
  parseRequestBody,
  parseRouteId,
  type ReleaseRouteContext,
} from "@/lib/api/api-utils";

export async function PATCH(request: NextRequest, context: ReleaseRouteContext) {
  const movieId = await parseRouteId(context.params);
  if (isErrorResponse(movieId)) return movieId;

  const releaseId = await parseReleaseId(context.params);
  if (isErrorResponse(releaseId)) return releaseId;

  const release = await findReleaseForMovie(prisma, movieId, releaseId);
  if (!release) return jsonError("Релиз не найден", 404);

  const data = await parseRequestBody(request, releaseUpdateSchema);
  if (isErrorResponse(data)) return data;

  try {
    const updated = await prisma.$transaction(async (tx) => {
      await updateReleaseWithTracks(tx, releaseId, data);
      return tx.release.findUnique({
        where: { id: releaseId },
        include: releaseInclude,
      });
    });

    return NextResponse.json(updated);
  } catch (err) {
    return mapDomainError(err, "Не удалось обновить релиз");
  }
}

export async function DELETE(_request: NextRequest, context: ReleaseRouteContext) {
  const movieId = await parseRouteId(context.params);
  if (isErrorResponse(movieId)) return movieId;

  const releaseId = await parseReleaseId(context.params);
  if (isErrorResponse(releaseId)) return releaseId;

  try {
    await deleteRelease(movieId, releaseId);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return mapDomainError(err, "Не удалось удалить релиз");
  }
}
