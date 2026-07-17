import type { Prisma } from "@/generated/prisma/client";
import { displayFilePath } from "@/lib/shared/display-path";
import { exportInclude } from "@/lib/releases/export-queue";

type ExportWithRelations = Prisma.ReleaseExportGetPayload<{
  include: typeof exportInclude;
}>;

export function serializeExport(job: ExportWithRelations) {
  return {
    id: job.id,
    movieId: job.movieId,
    releaseId: job.releaseId,
    movie: job.movie,
    release: job.release,
    status: job.status,
    phase: job.phase,
    progressPercent: job.progressPercent,
    progressMessage: job.progressMessage,
    progressSpeed: job.progressSpeed,
    sourceFilePath: job.sourceFilePath,
    sourceFileSize: job.sourceFileSize,
    targetPath: job.targetPath,
    targetPathDisplay: displayFilePath(job.targetPath),
    targetFilename: job.targetFilename,
    errorMessage: job.errorMessage,
    cancelRequested: job.cancelRequested,
    queueOrder: job.queueOrder,
    startedAt: job.startedAt?.toISOString() ?? null,
    finishedAt: job.finishedAt?.toISOString() ?? null,
    createdAt: job.createdAt.toISOString(),
    updatedAt: job.updatedAt.toISOString(),
  };
}

export type SerializedExport = ReturnType<typeof serializeExport>;
