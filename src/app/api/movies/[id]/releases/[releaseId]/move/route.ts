import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import { releaseInclude } from "@/lib/movies/movie-include";
import { moveReleaseDryRun } from "@/lib/releases/move-release";
import {
  enqueueMove,
  findActiveBuildForRelease,
  findActiveMoveForRelease,
} from "@/lib/releases/move-queue";
import { serializeMove } from "@/lib/releases/move-serialize";
import { findActiveExportForRelease } from "@/lib/releases/export-queue";
import {
  isErrorResponse,
  jsonError,
  mapDomainError,
  parseReleaseId,
  parseRouteId,
  type ReleaseRouteContext,
} from "@/lib/api/api-utils";

const moveBodySchema = z.object({
  filename: z.string().optional(),
  targetDir: z.string().optional(),
  externalStorageId: z.number().int().nullable().optional(),
  dryRun: z.boolean().optional(),
});

export async function POST(request: NextRequest, context: ReleaseRouteContext) {
  const movieId = await parseRouteId(context.params);
  if (isErrorResponse(movieId)) return movieId;

  const releaseId = await parseReleaseId(context.params);
  if (isErrorResponse(releaseId)) return releaseId;

  let body: z.infer<typeof moveBodySchema>;
  try {
    body = moveBodySchema.parse(await request.json());
  } catch {
    return jsonError("Некорректные данные", 400);
  }

  const release = await prisma.release.findFirst({
    where: { id: releaseId, movieId },
    include: releaseInclude,
  });
  if (!release) return jsonError("Релиз не найден", 404);

  const movie = await prisma.movie.findUnique({
    where: { id: movieId },
    select: { title: true, year: true },
  });
  if (!movie) return jsonError("Фильм не найден", 404);

  try {
    if (body.dryRun) {
      const result = await moveReleaseDryRun(
        release,
        movie,
        body.targetDir ?? "",
        body.filename,
      );
      return NextResponse.json(result);
    }

    if (!body.targetDir?.trim()) {
      return jsonError("Укажите папку назначения", 400);
    }

    if (!body.filename?.trim()) {
      return jsonError("Укажите имя файла", 400);
    }

    if (body.externalStorageId === undefined) {
      return jsonError("Укажите хранилище", 400);
    }

    const active = await findActiveMoveForRelease(releaseId);
    if (active) {
      return NextResponse.json(serializeMove(active));
    }

    const job = await enqueueMove(
      release,
      movie,
      body.filename,
      body.targetDir,
      body.externalStorageId,
    );
    return NextResponse.json(serializeMove(job), { status: 202 });
  } catch (err) {
    return mapDomainError(err, "Не удалось поставить перемещение в очередь");
  }
}

export async function GET(_request: NextRequest, context: ReleaseRouteContext) {
  const movieId = await parseRouteId(context.params);
  if (isErrorResponse(movieId)) return movieId;

  const releaseId = await parseReleaseId(context.params);
  if (isErrorResponse(releaseId)) return releaseId;

  const release = await prisma.release.findFirst({
    where: { id: releaseId, movieId },
    select: { id: true },
  });
  if (!release) return jsonError("Релиз не найден", 404);

  const [active, activeExport, activeBuild] = await Promise.all([
    findActiveMoveForRelease(releaseId),
    findActiveExportForRelease(releaseId),
    findActiveBuildForRelease(releaseId),
  ]);

  return NextResponse.json({
    job: active ? serializeMove(active) : null,
    activeExport: activeExport != null,
    activeBuild: activeBuild != null,
  });
}
