import { prisma } from "@/lib/db/prisma";
import { buildInclude } from "@/lib/builds/build-queue";
import { serializeBuild } from "@/lib/builds/build-serialize";
import type { SerializedBuild } from "@/lib/builds/build-serialize";
import { exportInclude } from "@/lib/releases/export-queue";
import { serializeExport } from "@/lib/releases/export-serialize";
import type { SerializedExport } from "@/lib/releases/export-serialize";
import { moveInclude } from "@/lib/releases/move-queue";
import { serializeMove } from "@/lib/releases/move-serialize";
import type { SerializedMove } from "@/lib/releases/move-serialize";
import type { ReleaseBuildStatus } from "@/generated/prisma/client";

const ACTIVE_STATUSES: ReleaseBuildStatus[] = ["QUEUED", "RUNNING"];

export type ActiveMediaJob =
  | { kind: "build"; job: SerializedBuild }
  | { kind: "export"; job: SerializedExport }
  | { kind: "move"; job: SerializedMove };

export interface ActiveMediaJobsPayload {
  builds: SerializedBuild[];
  exports: SerializedExport[];
  moves: SerializedMove[];
  jobs: ActiveMediaJob[];
  summary: {
    total: number;
    running: number;
    queued: number;
  };
}

function timestampMs(iso: string | null | undefined): number {
  if (!iso) return 0;
  const ms = Date.parse(iso);
  return Number.isFinite(ms) ? ms : 0;
}

function statusRank(status: ReleaseBuildStatus): number {
  return status === "RUNNING" ? 0 : 1;
}

export function sortActiveMediaJobs(
  builds: SerializedBuild[],
  exports: SerializedExport[],
  moves: SerializedMove[] = [],
): ActiveMediaJob[] {
  const jobs: ActiveMediaJob[] = [
    ...builds.map((job) => ({ kind: "build" as const, job })),
    ...exports.map((job) => ({ kind: "export" as const, job })),
    ...moves.map((job) => ({ kind: "move" as const, job })),
  ];

  return jobs.sort((a, b) => {
    const rankDiff = statusRank(a.job.status) - statusRank(b.job.status);
    if (rankDiff !== 0) return rankDiff;

    if (a.job.status === "RUNNING" && b.job.status === "RUNNING") {
      return (
        timestampMs(a.job.startedAt) - timestampMs(b.job.startedAt) ||
        a.job.id - b.job.id
      );
    }

    if (a.job.status === "QUEUED" && b.job.status === "QUEUED") {
      return a.job.queueOrder - b.job.queueOrder || a.job.id - b.job.id;
    }

    return a.job.id - b.job.id;
  });
}

export function summarizeActiveMediaJobs(
  builds: SerializedBuild[],
  exports: SerializedExport[],
  moves: SerializedMove[] = [],
) {
  const all = [...builds, ...exports, ...moves];
  return {
    total: all.length,
    running: all.filter((job) => job.status === "RUNNING").length,
    queued: all.filter((job) => job.status === "QUEUED").length,
  };
}

export async function fetchActiveMediaJobs(): Promise<ActiveMediaJobsPayload> {
  const [buildRows, exportRows, moveRows] = await Promise.all([
    prisma.releaseBuild.findMany({
      where: { status: { in: ACTIVE_STATUSES } },
      include: buildInclude,
    }),
    prisma.releaseExport.findMany({
      where: { status: { in: ACTIVE_STATUSES } },
      include: exportInclude,
    }),
    prisma.releaseMove.findMany({
      where: { status: { in: ACTIVE_STATUSES } },
      include: moveInclude,
    }),
  ]);

  const builds = buildRows.map(serializeBuild);
  const exports = exportRows.map(serializeExport);
  const moves = moveRows.map(serializeMove);

  return {
    builds,
    exports,
    moves,
    jobs: sortActiveMediaJobs(builds, exports, moves),
    summary: summarizeActiveMediaJobs(builds, exports, moves),
  };
}
