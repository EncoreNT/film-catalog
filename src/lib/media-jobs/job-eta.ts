import type { ReleaseBuildStatus } from "@/generated/prisma/client";
import { formatBuildEtaSeconds } from "@/lib/shared/duration-format";

const MIN_ELAPSED_SEC = 10;
const WARMUP_MS = 6_000;
const STALE_AFTER_MS = 15_000;
const SMOOTHING_TIME_MS = 20_000;

export type MediaJobEtaInput = {
  id?: number;
  status: ReleaseBuildStatus;
  phase?: string | null;
  progressPercent?: number | null;
  progressMessage?: string | null;
  progressSpeed?: number | null;
  sourceFileSize?: number | null;
  startedAt?: string | null;
  cancelRequested?: boolean;
};

function isCopying(job: MediaJobEtaInput): boolean {
  return job.status === "RUNNING" && job.phase === "copying" && !job.cancelRequested;
}

/** Percent per second keeps byte-based and elapsed-time estimates in one unit. */
function copyRate(job: MediaJobEtaInput, now: number): number | null {
  if (!isCopying(job)) return null;
  const percent = job.progressPercent;
  if (percent == null || !Number.isFinite(percent) || percent <= 0 || percent >= 100) return null;
  const startedAt = job.startedAt ? Date.parse(job.startedAt) : NaN;
  const elapsed = (now - startedAt) / 1000;
  if (Number.isFinite(startedAt) && elapsed < MIN_ELAPSED_SEC) return null;

  const size = job.sourceFileSize;
  const speed = job.progressSpeed;
  // An explicit zero means no throughput, not a reason to use an optimistic lifetime average.
  if (speed != null && (!Number.isFinite(speed) || speed <= 0)) return null;
  if (size != null && Number.isFinite(size) && size > 0 && speed != null) {
    return (speed / size) * 100;
  }
  if (!Number.isFinite(elapsed) || elapsed < MIN_ELAPSED_SEC || percent < 1) return null;
  return percent / elapsed;
}

export function estimateMediaJobRemainingSeconds(job: MediaJobEtaInput, now = Date.now()): number | null {
  const rate = copyRate(job, now);
  return rate == null ? null : Math.round((100 - job.progressPercent!) / rate);
}

export function mediaJobRunningEtaLabelFromSeconds(seconds: number | null | undefined): string | null {
  const formatted = formatBuildEtaSeconds(seconds, "ten-seconds");
  return formatted ? `осталось ${formatted}` : null;
}

export function mediaJobRunningEtaLabel(job: MediaJobEtaInput, now = Date.now()): string | null {
  return mediaJobRunningEtaLabelFromSeconds(estimateMediaJobRemainingSeconds(job, now));
}

/**
 * Client-side ETA filter; current MB/s remains the worker's 12-second measurement.
 * Time-based exponential smoothing avoids coupling responsiveness to polling frequency.
 * Repeated responses/heartbeats are not new measurements and cannot restart the clock.
 */
export function createMediaJobEtaEstimator() {
  let job: MediaJobEtaInput | null = null;
  let identity = "";
  let signature = "";
  let firstSampleAt = 0;
  let lastSampleAt = 0;
  let lastPercent = 0;
  let rate: number | null = null;
  let remaining: number | null = null;

  return {
    observe(next: MediaJobEtaInput | null | undefined, now: number) {
      job = next ?? null;
      if (!next || !isCopying(next)) {
        identity = signature = "";
        rate = remaining = null;
        return;
      }
      const nextIdentity = `${next.id ?? ""}:${next.startedAt ?? ""}:${next.sourceFileSize ?? ""}`;
      // updatedAt also changes on heartbeats, so it must not count as copy progress.
      const nextSignature = JSON.stringify([next.progressPercent, next.progressSpeed, next.progressMessage]);
      const reset = identity !== nextIdentity || (next.progressPercent ?? 0) < lastPercent || now < lastSampleAt;
      if (!reset && signature === nextSignature) return;
      const resume = now - lastSampleAt > STALE_AFTER_MS;
      if (reset || resume) {
        firstSampleAt = now;
        rate = null;
      }
      const measured = copyRate(next, now);
      const alpha = 1 - Math.exp(-Math.max(0, now - lastSampleAt) / SMOOTHING_TIME_MS);
      rate = measured == null ? null : rate == null ? measured : rate + alpha * (measured - rate);
      remaining = rate == null ? null : (100 - next.progressPercent!) / rate;
      identity = nextIdentity;
      signature = nextSignature;
      lastSampleAt = now;
      lastPercent = next.progressPercent ?? 0;
    },
    remainingSeconds(now: number): number | null {
      if (!job || !isCopying(job) || now - firstSampleAt < WARMUP_MS || now - lastSampleAt > STALE_AFTER_MS) return null;
      if (remaining == null) return null;
      // Never count down to zero while the worker still reports unfinished work.
      return Math.max(1, remaining - Math.max(0, now - lastSampleAt) / 1000);
    },
    label(now: number): string | null {
      if (!job || job.status !== "RUNNING" || job.cancelRequested) return null;
      if (job.phase === "updating" || job.phase === "register") return "Завершение…";
      if (!isCopying(job)) return null;
      if (job.progressPercent != null && job.progressPercent >= 100) return "Завершение…";
      if (now - lastSampleAt > STALE_AFTER_MS) return "Уточняем время…";
      return mediaJobRunningEtaLabelFromSeconds(this.remainingSeconds(now)) ?? "Оцениваем время…";
    },
  };
}
