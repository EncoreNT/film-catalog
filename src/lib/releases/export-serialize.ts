import type { Prisma } from "@/generated/prisma/client";
import { displayFilePath } from "@/lib/shared/display-path";
import { serializeMediaJobTimestamps } from "@/lib/media-jobs/serialize-base";
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
    ...serializeMediaJobTimestamps(job),
  };
}

export type SerializedExport = ReturnType<typeof serializeExport>;
