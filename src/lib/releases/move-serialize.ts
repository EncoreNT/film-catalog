import type { Prisma } from "@/generated/prisma/client";
import { displayFilePath } from "@/lib/shared/display-path";
import { serializeMediaJobTimestamps } from "@/lib/media-jobs/serialize-base";
import { moveInclude } from "@/lib/releases/move-queue";

type MoveWithRelations = Prisma.ReleaseMoveGetPayload<{
  include: typeof moveInclude;
}>;

export function serializeMove(job: MoveWithRelations) {
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
    sourceFilePathDisplay: displayFilePath(job.sourceFilePath),
    sourceFileSize: job.sourceFileSize,
    targetPath: job.targetPath,
    targetPathDisplay: displayFilePath(job.targetPath),
    targetFilename: job.targetFilename,
    externalStorageId: job.externalStorageId,
    externalStorage: job.externalStorage,
    errorMessage: job.errorMessage,
    warningMessage: job.warningMessage,
    cancelRequested: job.cancelRequested,
    queueOrder: job.queueOrder,
    ...serializeMediaJobTimestamps(job),
  };
}

export type SerializedMove = ReturnType<typeof serializeMove>;
