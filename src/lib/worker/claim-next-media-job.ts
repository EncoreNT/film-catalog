import { prisma } from "@/lib/db/prisma";
import { countRunningTranscodeBuilds, recoverStaleBuilds } from "@/lib/builds/build-queue";
import { getBuildTranscodeConcurrency } from "@/lib/db/settings";
import {
  destinationDiskKey,
  selectClaimableCopyJobs,
  type CopyJobCandidate,
} from "@/lib/media-jobs/destination-disk";
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
  extraWhere: { kind?: "recipe" | "bdmv" } = {},
): Promise<number | null> {
  const candidate = await prisma.releaseBuild.findFirst({
    where: {
      status: "QUEUED",
      cancelRequested: false,
      requiresTranscode,
      ...extraWhere,
    },
    orderBy: [{ queueOrder: "asc" }, { createdAt: "asc" }],
    select: { id: true },
  });
  if (!candidate) return null;
  return claimBuildById(candidate.id, workerId);
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

async function loadOccupiedCopyDisks(): Promise<Set<string>> {
  const [runningExports, runningMoves] = await Promise.all([
    prisma.releaseExport.findMany({
      where: { status: "RUNNING" },
      select: { targetPath: true },
    }),
    prisma.releaseMove.findMany({
      where: { status: "RUNNING" },
      select: { targetPath: true },
    }),
  ]);

  return new Set(
    [...runningExports, ...runningMoves].map((job) =>
      destinationDiskKey(job.targetPath),
    ),
  );
}

async function loadQueuedCopyJobs(): Promise<CopyJobCandidate[]> {
  const [queuedExports, queuedMoves] = await Promise.all([
    prisma.releaseExport.findMany({
      where: { status: "QUEUED", cancelRequested: false },
      select: { id: true, targetPath: true, createdAt: true },
    }),
    prisma.releaseMove.findMany({
      where: { status: "QUEUED", cancelRequested: false },
      select: { id: true, targetPath: true, createdAt: true },
    }),
  ]);

  return [
    ...queuedExports.map((job) => ({ kind: "export" as const, ...job })),
    ...queuedMoves.map((job) => ({ kind: "move" as const, ...job })),
  ];
}

async function claimSelectedCopyJobs(
  workerId: string,
  selected: CopyJobCandidate[],
): Promise<MediaJob[]> {
  const jobs: MediaJob[] = [];
  for (const candidate of selected) {
    const id =
      candidate.kind === "export"
        ? await claimExportById(candidate.id, workerId)
        : await claimMoveById(candidate.id, workerId);
    if (id == null) continue;
    jobs.push({ kind: candidate.kind, id });
  }
  return jobs;
}

/**
 * Claims every build/export/move slot available right now:
 * - copy-only builds: all queued (independent of transcode)
 * - transcode builds: up to BUILD_TRANSCODE_MAX_CONCURRENCY total RUNNING
 * - export/move: one RUNNING job per destination disk (unlimited across disks)
 */
export async function claimAvailableMediaJobs(
  workerId: string,
  options?: { includeBuilds?: boolean },
): Promise<MediaJob[]> {
  const includeBuilds = options?.includeBuilds ?? true;
  await recoverStaleMediaJobs();

  const jobs: MediaJob[] = [];

  if (includeBuilds) {
    const transcodeLimit = await getBuildTranscodeConcurrency();
    let transcodeRunning = await countRunningTranscodeBuilds();
    while (transcodeRunning < transcodeLimit) {
      const id = await claimNextQueuedBuild(workerId, true, { kind: "recipe" });
      if (id == null) break;
      jobs.push({ kind: "build", id, requiresTranscode: true });
      transcodeRunning += 1;
    }

    // Copy recipe jobs run in parallel. BDMV mux is disk-heavy: at most one
    // RUNNING bdmv job worker-wide (ADR-0020).
    while (true) {
      const id = await claimNextQueuedBuild(workerId, false, { kind: "recipe" });
      if (id == null) break;
      jobs.push({ kind: "build", id, requiresTranscode: false });
    }

    const runningBdmv = await prisma.releaseBuild.count({
      where: { status: "RUNNING", kind: "bdmv" },
    });
    if (runningBdmv === 0) {
      const id = await claimNextQueuedBuild(workerId, false, { kind: "bdmv" });
      if (id != null) {
        jobs.push({ kind: "build", id, requiresTranscode: false });
      }
    }
  }

  const occupiedDisks = await loadOccupiedCopyDisks();
  const claimableCopyJobs = selectClaimableCopyJobs(
    await loadQueuedCopyJobs(),
    occupiedDisks,
  );
  jobs.push(...(await claimSelectedCopyJobs(workerId, claimableCopyJobs)));

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
