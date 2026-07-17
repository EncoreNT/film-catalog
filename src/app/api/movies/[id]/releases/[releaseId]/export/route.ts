import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import { setExportTargetDir } from "@/lib/db/settings";
import { releaseInclude } from "@/lib/movies/movie-include";
import { exportReleaseDryRun } from "@/lib/releases/export-release";
import {
  enqueueExport,
  findActiveExportForRelease,
} from "@/lib/releases/export-queue";
import { serializeExport } from "@/lib/releases/export-serialize";
import {
  isErrorResponse,
  jsonError,
  mapDomainError,
  parseReleaseId,
  parseRouteId,
  type ReleaseRouteContext,
} from "@/lib/api/api-utils";

const exportBodySchema = z.object({
  filename: z.string().optional(),
  targetDir: z.string().optional(),
  dryRun: z.boolean().optional(),
});

export async function POST(request: NextRequest, context: ReleaseRouteContext) {
  const movieId = await parseRouteId(context.params);
  if (isErrorResponse(movieId)) return movieId;

  const releaseId = await parseReleaseId(context.params);
  if (isErrorResponse(releaseId)) return releaseId;

  let body: z.infer<typeof exportBodySchema>;
  try {
    body = exportBodySchema.parse(await request.json());
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
      const result = await exportReleaseDryRun(
        release,
        movie,
        body.targetDir,
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

    const active = await findActiveExportForRelease(releaseId);
    if (active) {
      return NextResponse.json(serializeExport(active));
    }

    const job = await enqueueExport(
      release,
      movie,
      body.filename,
      body.targetDir,
    );
    await setExportTargetDir(body.targetDir);
    return NextResponse.json(serializeExport(job), { status: 202 });
  } catch (err) {
    return mapDomainError(err, "Не удалось поставить экспорт в очередь");
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

  const active = await findActiveExportForRelease(releaseId);
  return NextResponse.json({
    job: active ? serializeExport(active) : null,
  });
}
