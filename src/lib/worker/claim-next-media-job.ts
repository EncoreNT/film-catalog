import { prisma } from "@/lib/db/prisma";
import {
  countRunningTranscodeBuilds,
  recoverStaleBuilds,
} from "@/lib/builds/build-queue";
import { BUILD_TRANSCODE_MAX_CONCURRENCY } from "@/lib/builds/build-presets";
import { recoverStaleExports } from "@/lib/releases/export-queue";
import { recoverStaleMoves } from "@/lib/releases/move-queue";

export type MediaJob =
  | { kind: "build"; id: number; requiresTranscode: boolean }
  | { kind: "export"; id: number }
  | { kind: "move"; id: number };

export async function recoverStaleMediaJobs() {
  await Promise.all([recoverStaleBuilds(), recoverStaleExports(), recoverStaleMoves()]);
}

async function claimBuildById(
  buildId: number,
  workerId: string,
): Promise<number | null> {
  const now = new Date();
  const updated = await prisma.releaseBuild.updateMany({
    where: { id: buildId, status: "QUEUED" },
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
  return updated.count > 0 ? buildId : null;
}

async function claimExportById(
  exportId: number,
  workerId: string,
): Promise<number | null> {
  const now = new Date();
  const updated = await prisma.releaseExport.updateMany({
    where: { id: exportId, status: "QUEUED" },
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
  return updated.count > 0 ? exportId : null;
}

async function claimNextQueuedBuild(
  workerId: string,
  requiresTranscode: boolean,
): Promise<number | null> {
  const candidate = await prisma.releaseBuild.findFirst({
    where: {
      status: "QUEUED",
      cancelRequested: false,
      requiresTranscode,
    },
    orderBy: [{ queueOrder: "asc" }, { createdAt: "asc" }],
    select: { id: true },
  });
  if (!candidate) return null;
  return claimBuildById(candidate.id, workerId);
}

async function claimNextQueuedExport(workerId: string): Promise<number | null> {
  const candidate = await prisma.releaseExport.findFirst({
    where: { status: "QUEUED", cancelRequested: false },
    orderBy: [{ queueOrder: "asc" }, { createdAt: "asc" }],
    select: { id: true },
  });
  if (!candidate) return null;
  return claimExportById(candidate.id, workerId);
}

async function claimMoveById(
  moveId: number,
  workerId: string,
): Promise<number | null> {
  const now = new Date();
  const updated = await prisma.releaseMove.updateMany({
    where: { id: moveId, status: "QUEUED" },
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
  return updated.count > 0 ? moveId : null;
}

async function claimNextQueuedMove(workerId: string): Promise<number | null> {
  const candidate = await prisma.releaseMove.findFirst({
    where: { status: "QUEUED", cancelRequested: false },
    orderBy: [{ queueOrder: "asc" }, { createdAt: "asc" }],
    select: { id: true },
  });
  if (!candidate) return null;
  return claimMoveById(candidate.id, workerId);
}

/**
 * Claims every build/export/move slot available right now:
 * - copy-only builds: all queued (independent of transcode)
 * - transcode builds: up to BUILD_TRANSCODE_MAX_CONCURRENCY total RUNNING
 * - exports: all queued (copy-only)
 */
export async function claimAvailableMediaJobs(
  workerId: string,
  options?: { includeBuilds?: boolean },
): Promise<MediaJob[]> {
  const includeBuilds = options?.includeBuilds ?? true;
  await recoverStaleMediaJobs();

  const jobs: MediaJob[] = [];

  if (includeBuilds) {
    let transcodeRunning = await countRunningTranscodeBuilds();
    while (transcodeRunning < BUILD_TRANSCODE_MAX_CONCURRENCY) {
      const id = await claimNextQueuedBuild(workerId, true);
      if (id == null) break;
      jobs.push({ kind: "build", id, requiresTranscode: true });
      transcodeRunning += 1;
    }

    while (true) {
      const id = await claimNextQueuedBuild(workerId, false);
      if (id == null) break;
      jobs.push({ kind: "build", id, requiresTranscode: false });
    }
  }

  while (true) {
    const id = await claimNextQueuedExport(workerId);
    if (id == null) break;
    jobs.push({ kind: "export", id });
  }

  while (true) {
    const id = await claimNextQueuedMove(workerId);
    if (id == null) break;
    jobs.push({ kind: "move", id });
  }

  return jobs;
}

/** Single-job claim (legacy). Prefer claimAvailableMediaJobs for parallel worker. */
export async function claimNextMediaJob(
  workerId: string,
  options?: { includeBuilds?: boolean },
): Promise<MediaJob | null> {
  const jobs = await claimAvailableMediaJobs(workerId, options);
  return jobs[0] ?? null;
}
