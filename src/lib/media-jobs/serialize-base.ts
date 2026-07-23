import type { ReleaseBuildStatus } from "@/generated/prisma/client";

/** Shared serialized fields for export/move queue jobs. */
export interface SerializedMediaJobBase {
  id: number;
  movieId: number;
  releaseId: number;
  status: ReleaseBuildStatus;
  phase: string | null;
  progressPercent: number | null;
  progressMessage: string | null;
  progressSpeed: number | null;
  sourceFilePath: string;
  sourceFileSize: number | null;
  targetPath: string;
  targetPathDisplay: string;
  targetFilename: string;
  errorMessage: string | null;
  cancelRequested: boolean;
  queueOrder: number;
  startedAt: string | null;
  finishedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export function serializeMediaJobTimestamps(job: {
  startedAt: Date | null;
  finishedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    startedAt: job.startedAt?.toISOString() ?? null,
    finishedAt: job.finishedAt?.toISOString() ?? null,
    createdAt: job.createdAt.toISOString(),
    updatedAt: job.updatedAt.toISOString(),
  };
}
