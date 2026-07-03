import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { releaseUpdateSchema } from "@/lib/api/validators";
import { releaseInclude } from "@/lib/movies/movie-include";
import { updateReleaseWithTracks } from "@/lib/releases/release-api";
import { findReleaseForMovie } from "@/lib/releases/probe-release";
import {
  isErrorResponse,
  jsonError,
  parseReleaseId,
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

  try {
    const body = await request.json();
    const data = releaseUpdateSchema.parse(body);

    const updated = await prisma.$transaction(async (tx) => {
      await updateReleaseWithTracks(tx, releaseId, data);
      return tx.release.findUnique({
        where: { id: releaseId },
        include: releaseInclude,
      });
    });

    return NextResponse.json(updated);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Не удалось обновить релиз";
    return jsonError(message, 400);
  }
}

export async function DELETE(_request: NextRequest, context: ReleaseRouteContext) {
  const movieId = await parseRouteId(context.params);
  if (isErrorResponse(movieId)) return movieId;

  const releaseId = await parseReleaseId(context.params);
  if (isErrorResponse(releaseId)) return releaseId;

  const release = await findReleaseForMovie(prisma, movieId, releaseId);
  if (!release) return jsonError("Релиз не найден", 404);

  const count = await prisma.release.count({ where: { movieId } });
  if (count <= 1) {
    return jsonError("Нельзя удалить единственный релиз фильма", 400);
  }

  await prisma.release.delete({ where: { id: releaseId } });
  return NextResponse.json({ ok: true });
}
