import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { releaseUpdateSchema } from "@/lib/validators";
import { releaseInclude } from "@/lib/movie-include";
import { updateReleaseWithTracks } from "@/lib/release-api";
import {
  isErrorResponse,
  jsonError,
  parseRouteId,
  type ReleaseRouteContext,
} from "@/lib/api-utils";

async function parseReleaseId(
  context: ReleaseRouteContext,
  movieId: number,
): Promise<number | NextResponse> {
  const params = await context.params;
  const releaseId = Number(params.releaseId);
  if (!Number.isInteger(releaseId) || releaseId <= 0) {
    return jsonError("Некорректный id релиза", 400);
  }
  const release = await prisma.release.findFirst({
    where: { id: releaseId, movieId },
    select: { id: true },
  });
  if (!release) return jsonError("Релиз не найден", 404);
  return releaseId;
}

export async function PATCH(request: NextRequest, context: ReleaseRouteContext) {
  const movieId = await parseRouteId(context.params);
  if (isErrorResponse(movieId)) return movieId;

  const releaseId = await parseReleaseId(context, movieId);
  if (releaseId instanceof NextResponse) return releaseId;

  try {
    const body = await request.json();
    const data = releaseUpdateSchema.parse(body);

    const release = await prisma.$transaction(async (tx) => {
      await updateReleaseWithTracks(tx, releaseId, data);
      return tx.release.findUnique({
        where: { id: releaseId },
        include: releaseInclude,
      });
    });

    return NextResponse.json(release);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Не удалось обновить релиз";
    return jsonError(message, 400);
  }
}

export async function DELETE(_request: NextRequest, context: ReleaseRouteContext) {
  const movieId = await parseRouteId(context.params);
  if (isErrorResponse(movieId)) return movieId;

  const releaseId = await parseReleaseId(context, movieId);
  if (releaseId instanceof NextResponse) return releaseId;

  const count = await prisma.release.count({ where: { movieId } });
  if (count <= 1) {
    return jsonError("Нельзя удалить единственный релиз фильма", 400);
  }

  await prisma.release.delete({ where: { id: releaseId } });
  return NextResponse.json({ ok: true });
}
