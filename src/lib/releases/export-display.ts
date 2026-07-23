import type { ReleaseBuildStatus } from "@/generated/prisma/client";
import type { SerializedExport } from "@/lib/releases/export-serialize";
import {
  buildMediaJobStatusMeta,
  isMediaJobTerminal,
  mediaJobSizeHint,
  mediaJobSpeedLabel,
} from "@/lib/media-jobs/job-display";

export const EXPORT_STATUS_META = buildMediaJobStatusMeta("export");

export function isExportTerminal(status: ReleaseBuildStatus): boolean {
  return isMediaJobTerminal(status);
}

export function exportSpeedLabel(bytesPerSecond: number | null | undefined): string | null {
  return mediaJobSpeedLabel(bytesPerSecond);
}

export function exportSizeHint(job: SerializedExport): string | null {
  return mediaJobSizeHint(job.sourceFileSize);
}
