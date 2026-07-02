import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { releaseInclude } from "@/lib/movie-include";
import { syncReleaseTracksFromProbe } from "@/lib/movie-tracks";
import { probeMediaFile } from "@/lib/ffprobe";
import {
  isErrorResponse,
  jsonError,
  parseRouteId,
  type ReleaseRouteContext,
} from "@/lib/api-utils";

export async function POST(_request: Request, context: ReleaseRouteContext) {
  const movieId = await parseRouteId(context.params);
  if (isErrorResponse(movieId)) return movieId;

  const params = await context.params;
  const releaseId = Number(params.releaseId);
  if (!Number.isInteger(releaseId) || releaseId <= 0) {
    return jsonError("Некорректный id релиза", 400);
  }

  const release = await prisma.release.findFirst({
    where: { id: releaseId, movieId },
    select: { id: true, filePath: true },
  });
  if (!release) return jsonError("Релиз не найден", 404);
  if (!release.filePath) {
    return jsonError("У релиза не указан путь к файлу", 400);
  }

  try {
    const probe = await probeMediaFile(release.filePath);
    await prisma.$transaction(async (tx) => {
      await tx.release.update({
        where: { id: releaseId },
        data: { durationSeconds: probe.durationSeconds },
      });
      await syncReleaseTracksFromProbe(tx, releaseId, probe);
    });

    const updated = await prisma.release.findUnique({
      where: { id: releaseId },
      include: releaseInclude,
    });

    return NextResponse.json(updated);
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Не удалось проанализировать файл";
    return jsonError(message, 400);
  }
}
