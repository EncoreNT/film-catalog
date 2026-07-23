import type { ReleaseBuildStatus } from "@/generated/prisma/client";
import type { SerializedMove } from "@/lib/releases/move-serialize";
import {
  buildMediaJobStatusMeta,
  isMediaJobTerminal,
  mediaJobSizeHint,
  mediaJobSpeedLabel,
} from "@/lib/media-jobs/job-display";

export const MOVE_STATUS_META = buildMediaJobStatusMeta("move");

export function isMoveTerminal(status: ReleaseBuildStatus): boolean {
  return isMediaJobTerminal(status);
}

export function moveSpeedLabel(bytesPerSecond: number | null | undefined): string | null {
  return mediaJobSpeedLabel(bytesPerSecond);
}

export function moveSizeHint(job: SerializedMove): string | null {
  return mediaJobSizeHint(job.sourceFileSize);
}
