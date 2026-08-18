import type { ReleaseBuildStatus } from "@/generated/prisma/client";
import { formatBuildEtaSeconds } from "@/lib/shared/duration-format";

const MIN_PROGRESS_PERCENT = 1;
const MIN_ELAPSED_SEC = 2;
const FINALIZE_ETA_SECONDS = 8;

export type MediaJobEtaInput = {
  status: ReleaseBuildStatus;
  phase?: string | null;
  progressPercent?: number | null;
  progressSpeed?: number | null;
  sourceFileSize?: number | null;
  startedAt?: string | null;
};

export function estimateMediaJobRemainingSeconds(
  job: MediaJobEtaInput,
  now = Date.now(),
): number | null {
  if (job.status !== "RUNNING") return null;

  const phase = job.phase ?? "";
  if (phase === "updating" || phase === "register") {
    return FINALIZE_ETA_SECONDS;
  }

  const fromBytes = remainingSecondsFromBytes(job);
  const fromElapsed = remainingSecondsFromElapsed(job, now);

  if (fromBytes == null && fromElapsed == null) return null;
  return Math.round(fromBytes ?? fromElapsed ?? 0);
}

function remainingSecondsFromBytes(job: MediaJobEtaInput): number | null {
  const size = job.sourceFileSize;
  const speed = job.progressSpeed;
  const percent = job.progressPercent;
  if (
    size == null ||
    size <= 0 ||
    speed == null ||
    speed <= 0 ||
    percent == null ||
    percent <= 0
  ) {
    return null;
  }

  const remainingBytes = size * (1 - Math.min(percent, 100) / 100);
  return Math.max(0, remainingBytes / speed);
}

function remainingSecondsFromElapsed(
  job: MediaJobEtaInput,
  now: number,
): number | null {
  const percent = job.progressPercent;
  if (percent == null || percent < MIN_PROGRESS_PERCENT) return null;
  if (!job.startedAt) return null;

  const startedAtMs = Date.parse(job.startedAt);
  if (!Number.isFinite(startedAtMs)) return null;

  const elapsedSec = Math.max(0, (now - startedAtMs) / 1000);
  if (elapsedSec < MIN_ELAPSED_SEC) return null;

  return Math.max(0, (elapsedSec / percent) * (100 - percent));
}

export function mediaJobRunningEtaLabelFromSeconds(
  seconds: number | null | undefined,
): string | null {
  const formatted = formatBuildEtaSeconds(seconds);
  return formatted ? `осталось ${formatted}` : null;
}

export function mediaJobRunningEtaLabel(
  job: MediaJobEtaInput,
  now = Date.now(),
): string | null {
  return mediaJobRunningEtaLabelFromSeconds(
    estimateMediaJobRemainingSeconds(job, now),
  );
}
