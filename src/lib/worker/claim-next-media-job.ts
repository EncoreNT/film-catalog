import { prisma } from "@/lib/db/prisma";
import { recoverStaleBuilds } from "@/lib/builds/build-queue";
import { recoverStaleExports } from "@/lib/releases/export-queue";

export type MediaJob =
  | { kind: "build"; id: number }
  | { kind: "export"; id: number };

export async function recoverStaleMediaJobs() {
  await Promise.all([recoverStaleBuilds(), recoverStaleExports()]);
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

export async function claimNextMediaJob(
  workerId: string,
  options?: { includeBuilds?: boolean },
): Promise<MediaJob | null> {
  const includeBuilds = options?.includeBuilds ?? true;
  await recoverStaleMediaJobs();

  const [nextBuild, nextExport] = await Promise.all([
    includeBuilds
      ? prisma.releaseBuild.findFirst({
          where: { status: "QUEUED", cancelRequested: false },
          orderBy: [{ queueOrder: "asc" }, { createdAt: "asc" }],
          select: { id: true, createdAt: true },
        })
      : Promise.resolve(null),
    prisma.releaseExport.findFirst({
      where: { status: "QUEUED", cancelRequested: false },
      orderBy: [{ queueOrder: "asc" }, { createdAt: "asc" }],
      select: { id: true, createdAt: true },
    }),
  ]);

  if (!nextBuild && !nextExport) return null;

  const pickExport =
    nextExport != null &&
    (nextBuild == null || nextExport.createdAt <= nextBuild.createdAt);

  if (pickExport) {
    const id = await claimExportById(nextExport.id, workerId);
    return id != null ? { kind: "export", id } : null;
  }

  if (nextBuild) {
    const id = await claimBuildById(nextBuild.id, workerId);
    return id != null ? { kind: "build", id } : null;
  }

  return null;
}
