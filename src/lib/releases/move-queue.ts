import { prisma } from "@/lib/db/prisma";
import type { ReleaseBuildStatus } from "@/generated/prisma/client";
import {
  BUILD_HEARTBEAT_INTERVAL_MS,
  BUILD_STALE_LEASE_MS,
} from "@/lib/builds/build-presets";
import { releaseInclude } from "@/lib/movies/movie-include";
import type { ReleaseWithTracks } from "@/lib/movies/movie-include";
import { findActiveExportForRelease } from "@/lib/releases/export-queue";
import type { ExportMovieInfo } from "@/lib/releases/export-release";
import {
  assertMoveTargetAvailable,
  assertMoveTargetFits,
  moveReleaseDryRun,
} from "@/lib/releases/move-release";

const ACTIVE_STATUSES: ReleaseBuildStatus[] = ["QUEUED", "RUNNING"];

export const moveInclude = {
  movie: {
    select: { id: true, slug: true, title: true, coverPath: true, updatedAt: true },
  },
  release: {
    include: releaseInclude,
  },
  externalStorage: {
    select: { id: true, name: true, path: true },
  },
} as const;

export async function nextMoveQueueOrder(): Promise<number> {
  const agg = await prisma.releaseMove.aggregate({ _max: { queueOrder: true } });
  return (agg._max.queueOrder ?? 0) + 1;
}

export async function findActiveBuildForRelease(releaseId: number) {
  return prisma.releaseBuild.findFirst({
    where: {
      status: { in: ACTIVE_STATUSES },
      OR: [
        { sources: { some: { releaseId } } },
        { tracks: { some: { sourceReleaseId: releaseId } } },
      ],
    },
    select: { id: true },
  });
}

export async function findActiveMoveForRelease(releaseId: number) {
  return prisma.releaseMove.findFirst({
    where: {
      releaseId,
      status: { in: ACTIVE_STATUSES },
    },
    orderBy: { createdAt: "desc" },
    include: moveInclude,
  });
}

export async function assertReleaseCanMove(releaseId: number): Promise<void> {
  const [activeMove, activeExport, activeBuild] = await Promise.all([
    findActiveMoveForRelease(releaseId),
    findActiveExportForRelease(releaseId),
    findActiveBuildForRelease(releaseId),
  ]);

  if (activeMove) {
    throw new Error("Перемещение уже выполняется");
  }
  if (activeExport) {
    throw new Error("Дождитесь завершения экспорта");
  }
  if (activeBuild) {
    throw new Error("Релиз участвует в активной сборке");
  }
}

export async function enqueueMove(
  release: ReleaseWithTracks,
  movie: ExportMovieInfo,
  filename: string,
  targetDir: string,
  externalStorageId: number | null,
) {
  await assertReleaseCanMove(release.id);

  const dryRun = await moveReleaseDryRun(release, movie, targetDir, filename);
  if (dryRun.sameAsSource) {
    throw new Error("Путь назначения совпадает с текущим расположением файла");
  }

  const sourceFilePath = release.filePath!.trim();
  await assertMoveTargetAvailable(dryRun.targetPath, sourceFilePath);
  await assertMoveTargetFits(targetDir, release.fileSize);

  return prisma.releaseMove.create({
    data: {
      movieId: release.movieId,
      releaseId: release.id,
      status: "QUEUED",
      queueOrder: await nextMoveQueueOrder(),
      sourceFilePath,
      sourceFileSize: release.fileSize,
      targetPath: dryRun.targetPath,
      targetFilename: dryRun.suggestedFilename,
      externalStorageId,
    },
    include: moveInclude,
  });
}

export async function recoverStaleMoves() {
  const staleBefore = new Date(Date.now() - BUILD_STALE_LEASE_MS);
  const stale = await prisma.releaseMove.findMany({
    where: {
      status: "RUNNING",
      OR: [{ heartbeatAt: { lt: staleBefore } }, { heartbeatAt: null }],
    },
    select: { id: true },
  });

  for (const job of stale) {
    await prisma.releaseMove.update({
      where: { id: job.id },
      data: {
        status: "QUEUED",
        phase: "recovered",
        progressMessage: "Восстановление после сбоя worker",
        heartbeatAt: null,
      },
    });
  }
}

export async function touchMoveHeartbeat(moveId: number) {
  await prisma.releaseMove.update({
    where: { id: moveId },
    data: { heartbeatAt: new Date() },
  });
}

export function startMoveHeartbeat(moveId: number): () => void {
  const timer = setInterval(() => {
    void touchMoveHeartbeat(moveId);
  }, BUILD_HEARTBEAT_INTERVAL_MS);
  return () => clearInterval(timer);
}

export async function updateMoveProgress(
  moveId: number,
  data: {
    phase?: string;
    progressPercent?: number;
    progressMessage?: string;
    progressSpeed?: number | null;
  },
) {
  await prisma.releaseMove.update({
    where: { id: moveId },
    data: {
      ...data,
      heartbeatAt: new Date(),
    },
  });
}

export async function finishMove(
  moveId: number,
  status: ReleaseBuildStatus,
  data?: { errorMessage?: string; warningMessage?: string },
) {
  await prisma.releaseMove.update({
    where: { id: moveId },
    data: {
      status,
      finishedAt: new Date(),
      errorMessage: data?.errorMessage ?? null,
      warningMessage: data?.warningMessage ?? null,
      progressPercent: status === "SUCCEEDED" ? 100 : undefined,
    },
  });
}

export async function requestMoveCancel(moveId: number) {
  const job = await prisma.releaseMove.findUnique({
    where: { id: moveId },
    select: { status: true },
  });
  if (!job) throw new Error("Перемещение не найдено");
  if (!ACTIVE_STATUSES.includes(job.status)) {
    throw new Error("Перемещение уже завершено");
  }

  if (job.status === "QUEUED") {
    return prisma.releaseMove.update({
      where: { id: moveId },
      data: {
        status: "CANCELLED",
        cancelRequested: true,
        finishedAt: new Date(),
        progressMessage: "Отменено до запуска",
      },
      include: moveInclude,
    });
  }

  return prisma.releaseMove.update({
    where: { id: moveId },
    data: { cancelRequested: true, progressMessage: "Запрошена отмена" },
    include: moveInclude,
  });
}

export async function retryMove(moveId: number) {
  const job = await prisma.releaseMove.findUnique({
    where: { id: moveId },
    select: { status: true },
  });
  if (!job) throw new Error("Перемещение не найдено");
  if (job.status !== "FAILED" && job.status !== "CANCELLED") {
    throw new Error("Повтор доступен только для неуспешных или отменённых перемещений");
  }

  return prisma.releaseMove.update({
    where: { id: moveId },
    data: {
      status: "QUEUED",
      queueOrder: await nextMoveQueueOrder(),
      phase: null,
      progressPercent: 0,
      progressMessage: null,
      errorMessage: null,
      warningMessage: null,
      cancelRequested: false,
      heartbeatAt: null,
      startedAt: null,
      finishedAt: null,
    },
    include: moveInclude,
  });
}

export async function isMoveCancelRequested(moveId: number): Promise<boolean> {
  const job = await prisma.releaseMove.findUnique({
    where: { id: moveId },
    select: { cancelRequested: true },
  });
  return job?.cancelRequested ?? false;
}
