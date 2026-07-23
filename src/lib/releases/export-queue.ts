import { prisma } from "@/lib/db/prisma";
import type { ReleaseBuildStatus } from "@/generated/prisma/client";
import {
  BUILD_HEARTBEAT_INTERVAL_MS,
  BUILD_STALE_LEASE_MS,
} from "@/lib/builds/build-presets";
import { releaseInclude } from "@/lib/movies/movie-include";
import type { ReleaseWithTracks } from "@/lib/movies/movie-include";
import {
  exportReleaseDryRun,
  type ExportMovieInfo,
} from "@/lib/releases/export-release";
import { assertTargetDirFits } from "@/lib/shared/disk-space-fit";

const ACTIVE_STATUSES: ReleaseBuildStatus[] = ["QUEUED", "RUNNING"];

export const exportInclude = {
  movie: {
    select: { id: true, slug: true, title: true, coverPath: true, updatedAt: true },
  },
  release: {
    include: releaseInclude,
  },
} as const;

export async function nextExportQueueOrder(): Promise<number> {
  const agg = await prisma.releaseExport.aggregate({ _max: { queueOrder: true } });
  return (agg._max.queueOrder ?? 0) + 1;
}

export async function enqueueExport(
  release: ReleaseWithTracks,
  movie: ExportMovieInfo,
  filename: string,
  targetDir: string,
) {
  const dryRun = await exportReleaseDryRun(release, movie, targetDir, filename);
  await assertTargetDirFits(targetDir, release.fileSize);
  const sourceFilePath = release.filePath!.trim();

  return prisma.releaseExport.create({
    data: {
      movieId: release.movieId,
      releaseId: release.id,
      status: "QUEUED",
      queueOrder: await nextExportQueueOrder(),
      sourceFilePath,
      sourceFileSize: release.fileSize,
      targetPath: dryRun.targetPath,
      targetFilename: dryRun.suggestedFilename,
    },
    include: exportInclude,
  });
}

export async function claimNextExport(workerId: string) {
  await recoverStaleExports();

  const candidate = await prisma.releaseExport.findFirst({
    where: { status: "QUEUED", cancelRequested: false },
    orderBy: [{ queueOrder: "asc" }, { createdAt: "asc" }],
    select: { id: true },
  });
  if (!candidate) return null;

  const now = new Date();
  const updated = await prisma.releaseExport.updateMany({
    where: { id: candidate.id, status: "QUEUED" },
    data: {
      status: "RUNNING",
      phase: "starting",
      startedAt: now,
      heartbeatAt: now,
      progressPercent: 0,
      progressMessage: `worker:${workerId}`,
      errorMessage: null,
    },
  });

  if (updated.count === 0) return null;

  return prisma.releaseExport.findUnique({
    where: { id: candidate.id },
    include: exportInclude,
  });
}

export async function recoverStaleExports() {
  const staleBefore = new Date(Date.now() - BUILD_STALE_LEASE_MS);
  const stale = await prisma.releaseExport.findMany({
    where: {
      status: "RUNNING",
      OR: [{ heartbeatAt: { lt: staleBefore } }, { heartbeatAt: null }],
    },
    select: { id: true },
  });

  for (const job of stale) {
    await prisma.releaseExport.update({
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

export async function touchExportHeartbeat(exportId: number) {
  await prisma.releaseExport.update({
    where: { id: exportId },
    data: { heartbeatAt: new Date() },
  });
}

export function startExportHeartbeat(exportId: number): () => void {
  const timer = setInterval(() => {
    void touchExportHeartbeat(exportId);
  }, BUILD_HEARTBEAT_INTERVAL_MS);
  return () => clearInterval(timer);
}

export async function updateExportProgress(
  exportId: number,
  data: {
    phase?: string;
    progressPercent?: number;
    progressMessage?: string;
    progressSpeed?: number | null;
  },
) {
  await prisma.releaseExport.update({
    where: { id: exportId },
    data: {
      ...data,
      heartbeatAt: new Date(),
    },
  });
}

export async function finishExport(
  exportId: number,
  status: ReleaseBuildStatus,
  data?: { errorMessage?: string },
) {
  await prisma.releaseExport.update({
    where: { id: exportId },
    data: {
      status,
      finishedAt: new Date(),
      errorMessage: data?.errorMessage ?? null,
      progressPercent: status === "SUCCEEDED" ? 100 : undefined,
    },
  });
}

export async function requestExportCancel(exportId: number) {
  const job = await prisma.releaseExport.findUnique({
    where: { id: exportId },
    select: { status: true },
  });
  if (!job) throw new Error("Экспорт не найден");
  if (!ACTIVE_STATUSES.includes(job.status)) {
    throw new Error("Экспорт уже завершён");
  }

  if (job.status === "QUEUED") {
    return prisma.releaseExport.update({
      where: { id: exportId },
      data: {
        status: "CANCELLED",
        cancelRequested: true,
        finishedAt: new Date(),
        progressMessage: "Отменено до запуска",
      },
      include: exportInclude,
    });
  }

  return prisma.releaseExport.update({
    where: { id: exportId },
    data: { cancelRequested: true, progressMessage: "Запрошена отмена" },
    include: exportInclude,
  });
}

export async function retryExport(exportId: number) {
  const job = await prisma.releaseExport.findUnique({
    where: { id: exportId },
    select: { status: true },
  });
  if (!job) throw new Error("Экспорт не найден");
  if (job.status !== "FAILED" && job.status !== "CANCELLED") {
    throw new Error("Повтор доступен только для неуспешных или отменённых экспортов");
  }

  return prisma.releaseExport.update({
    where: { id: exportId },
    data: {
      status: "QUEUED",
      queueOrder: await nextExportQueueOrder(),
      phase: null,
      progressPercent: 0,
      progressMessage: null,
      errorMessage: null,
      cancelRequested: false,
      heartbeatAt: null,
      startedAt: null,
      finishedAt: null,
    },
    include: exportInclude,
  });
}

export async function isExportCancelRequested(exportId: number): Promise<boolean> {
  const job = await prisma.releaseExport.findUnique({
    where: { id: exportId },
    select: { cancelRequested: true },
  });
  return job?.cancelRequested ?? false;
}

export async function findActiveExportForRelease(releaseId: number) {
  return prisma.releaseExport.findFirst({
    where: {
      releaseId,
      status: { in: ACTIVE_STATUSES },
    },
    orderBy: { createdAt: "desc" },
    include: exportInclude,
  });
}
