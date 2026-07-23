import type { SerializedBuild } from "@/lib/builds/build-serialize";
import { parseFfmpegSpeed } from "@/lib/builds/build-ffmpeg";
import { formatBuildEtaSeconds } from "@/lib/shared/duration-format";

export { formatBuildEtaSeconds };

const DEFAULT_TRANSCODE_SPEED = 1;
const PREPARE_ETA_SECONDS = 30;
const FINALIZE_ETA_SECONDS = 45;
/** Fallback mux budget before mkvmerge reports progress (stream-copy remux). */
const MUX_ETA_SECONDS = 45;
const MUX_ETA_PER_HOUR = 30;
/** Use wall-clock mux speed once mkvmerge percent is at least this high. */
const MUX_OBSERVED_MIN_PROGRESS = 0.04;

export interface BuildEtaSnapshot {
  progressSpeed: number | null;
  progressOutTimeMs: number | null;
  progressDurationMs: number | null;
  progressStepIndex: number | null;
  progressStepTotal: number | null;
}

export type BuildEtaInput = Pick<
  SerializedBuild,
  | "id"
  | "status"
  | "phase"
  | "progressPercent"
  | "progressMessage"
  | "sources"
  | "tracks"
  | "startedAt"
  | "updatedAt"
  | "queueOrder"
  | "requiresTranscode"
> &
  BuildEtaSnapshot;

export function buildVideoDurationSeconds(
  build: Pick<SerializedBuild, "sources">,
): number | null {
  const videoSource = build.sources.find((source) => source.role === "video");
  if (videoSource?.durationSeconds != null && videoSource.durationSeconds > 0) {
    return videoSource.durationSeconds;
  }
  if (videoSource?.release?.durationSeconds != null && videoSource.release.durationSeconds > 0) {
    return videoSource.release.durationSeconds;
  }

  for (const source of build.sources) {
    if (source.durationSeconds != null && source.durationSeconds > 0) {
      return source.durationSeconds;
    }
    if (source.release?.durationSeconds != null && source.release.durationSeconds > 0) {
      return source.release.durationSeconds;
    }
  }

  return null;
}

export function countTranscodeTracks(
  build: Pick<SerializedBuild, "tracks">,
): number {
  return build.tracks.filter(
    (track) => track.kind === "AUDIO" && track.audioMode === "TRANSCODE",
  ).length;
}

export { parseFfmpegSpeed };

export function estimateMuxBudgetSeconds(
  durationSeconds: number | null | undefined,
): number {
  if (durationSeconds != null && durationSeconds > 0) {
    return Math.max(
      MUX_ETA_SECONDS,
      Math.round((durationSeconds / 3600) * MUX_ETA_PER_HOUR),
    );
  }
  return MUX_ETA_SECONDS;
}

export function estimateMuxRemainingSeconds(
  progressPercent: number | null | undefined,
  durationSeconds?: number | null,
  message?: string | null,
): number {
  const budget = estimateMuxBudgetSeconds(durationSeconds);
  const muxSub = extractMuxPercentFromMessage(message);
  const effectiveOverall =
    muxSub != null ? 60 + (muxSub / 100) * 30 : progressPercent;
  if (effectiveOverall == null) return budget;
  const muxProgress = clamp01((effectiveOverall - 60) / 30);
  return Math.max(5, (1 - muxProgress) * budget);
}

export function estimateTranscodeTrackSeconds(
  durationSeconds: number,
  speed = DEFAULT_TRANSCODE_SPEED,
): number {
  if (durationSeconds <= 0) return 0;
  return durationSeconds / Math.max(speed, 0.05);
}

/** Static estimate for a queued build (recipe only, no ffmpeg telemetry). */
export function estimateRecipeDurationSeconds(
  build: Pick<SerializedBuild, "sources" | "tracks">,
): number {
  const durationSeconds = buildVideoDurationSeconds(build) ?? 7200;
  const transcodeCount = countTranscodeTracks(build);
  const transcodeSeconds =
    transcodeCount * estimateTranscodeTrackSeconds(durationSeconds);
  const muxSeconds = estimateMuxBudgetSeconds(durationSeconds);

  return Math.round(PREPARE_ETA_SECONDS + transcodeSeconds + muxSeconds + FINALIZE_ETA_SECONDS);
}

export function estimateRunningRemainingSeconds(
  build: BuildEtaInput,
  now = Date.now(),
): number | null {
  if (build.status !== "RUNNING") return null;

  const phase = build.phase ?? "";
  const durationSeconds = buildVideoDurationSeconds(build);

  if (phase === "transcode") {
    return estimateTranscodeRemainingSeconds(build, durationSeconds, now);
  }

  if (phase === "mux") {
    return estimateMuxPhaseRemainingSeconds(build, durationSeconds, now);
  }

  if (phase === "finalize" || phase === "register") {
    return phase === "register" ? 15 : FINALIZE_ETA_SECONDS;
  }

  if (phase === "prepare" || phase === "starting" || phase === "recovered") {
    const transcodeCount = countTranscodeTracks(build);
    const duration = durationSeconds ?? 7200;
    return Math.round(
      PREPARE_ETA_SECONDS +
        transcodeCount * estimateTranscodeTrackSeconds(duration) +
        estimateMuxBudgetSeconds(duration) +
        FINALIZE_ETA_SECONDS,
    );
  }

  if (build.progressPercent != null && build.startedAt) {
    const elapsedSec = Math.max(
      1,
      (now - Date.parse(build.startedAt)) / 1000,
    );
    if (!Number.isFinite(elapsedSec) || build.progressPercent <= 1) return null;
    const totalSec = (elapsedSec / build.progressPercent) * 100;
    return Math.max(0, Math.round(totalSec - elapsedSec));
  }

  return estimateRecipeDurationSeconds(build);
}

function estimateTranscodeRemainingSeconds(
  build: BuildEtaInput,
  durationSeconds: number | null,
  now = Date.now(),
): number | null {
  const durationMs =
    build.progressDurationMs ??
    (durationSeconds != null ? Math.round(durationSeconds * 1000) : null);
  if (durationMs == null || durationMs <= 0) {
    return estimateRecipeDurationSeconds(build);
  }

  const speed =
    build.progressSpeed ??
    parseFfmpegSpeed(extractSpeedFromMessage(build.progressMessage)) ??
    DEFAULT_TRANSCODE_SPEED;

  const tickMs = build.updatedAt
    ? Math.min(
        15_000,
        Math.max(0, now - Date.parse(build.updatedAt)),
      )
    : 0;
  const outTimeMs = Math.min(
    durationMs,
    Math.max(0, (build.progressOutTimeMs ?? 0) + tickMs * speed),
  );
  const currentRemainingSec = Math.max(
    0,
    (durationMs - outTimeMs) / 1000 / Math.max(speed, 0.05),
  );

  const stepTotal = build.progressStepTotal ?? countTranscodeTracks(build);
  const stepIndex = build.progressStepIndex ?? 0;
  const remainingTracks = Math.max(0, stepTotal - stepIndex - 1);
  const trackDurationSec = durationMs / 1000;
  const muxBudget = estimateMuxBudgetSeconds(trackDurationSec);

  return Math.round(
    currentRemainingSec +
      remainingTracks * estimateTranscodeTrackSeconds(trackDurationSec, speed) +
      muxBudget +
      FINALIZE_ETA_SECONDS,
  );
}

function estimateMuxPhaseRemainingSeconds(
  build: BuildEtaInput,
  durationSeconds: number | null,
  now: number,
): number {
  const staticBudget = estimateMuxBudgetSeconds(durationSeconds);
  const muxSub = extractMuxPercentFromMessage(build.progressMessage);
  const muxStartedMs = resolveMuxPhaseStartedMs(build);

  // mkvmerge reports sub-percent in progressMessage; until the first line
  // arrives we only know phase=mux and decay the static mux budget by wall clock.
  if (muxSub == null && (build.progressPercent == null || build.progressPercent <= 60)) {
    const muxElapsedSec = resolveMuxElapsedSeconds(build, now);
    return Math.max(
      FINALIZE_ETA_SECONDS,
      staticBudget + FINALIZE_ETA_SECONDS - muxElapsedSec,
    );
  }

  const progressNow = resolveMuxProgressNow(build, muxSub, now, muxStartedMs);

  // Self-calibrate from observed mkvmerge speed: elapsed / progress × (1 − progress).
  if (
    muxStartedMs != null &&
    progressNow >= MUX_OBSERVED_MIN_PROGRESS
  ) {
    const elapsedNowSec = Math.max(0.5, (now - muxStartedMs) / 1000);
    const totalMuxSec = elapsedNowSec / progressNow;
    const maxTotalMuxSec = Math.max(staticBudget * 4, staticBudget + 120);
    if (totalMuxSec <= maxTotalMuxSec) {
      const remainingMuxSec = Math.max(0, totalMuxSec - elapsedNowSec);
      return Math.max(FINALIZE_ETA_SECONDS, remainingMuxSec + FINALIZE_ETA_SECONDS);
    }
  }

  const muxRemainingSec = (1 - progressNow) * staticBudget;
  return Math.max(FINALIZE_ETA_SECONDS, muxRemainingSec + FINALIZE_ETA_SECONDS);
}

function resolveMuxProgressNow(
  build: BuildEtaInput,
  muxSub: number | null,
  now: number,
  muxStartedMs: number | null,
): number {
  if (muxSub != null) {
    if (muxStartedMs != null && build.updatedAt) {
      const elapsedAtUpdateSec = Math.max(
        0.5,
        (Date.parse(build.updatedAt) - muxStartedMs) / 1000,
      );
      const elapsedNowSec = Math.max(0.5, (now - muxStartedMs) / 1000);
      const progressAtUpdate = muxSub / 100;
      return clamp01(progressAtUpdate * (elapsedNowSec / elapsedAtUpdateSec));
    }
    return clamp01(muxSub / 100);
  }

  const rawProgress = clamp01(((build.progressPercent ?? 60) - 60) / 30);
  if (muxStartedMs == null || !build.updatedAt || rawProgress <= 0) {
    return rawProgress;
  }

  const elapsedAtUpdateSec = Math.max(
    0.5,
    (Date.parse(build.updatedAt) - muxStartedMs) / 1000,
  );
  const elapsedNowSec = Math.max(0.5, (now - muxStartedMs) / 1000);
  return clamp01(rawProgress * (elapsedNowSec / elapsedAtUpdateSec));
}

/** Runner stores wall-clock epoch ms in progressOutTimeMs when mux starts. */
function resolveMuxPhaseStartedMs(build: BuildEtaInput): number | null {
  if (build.phase !== "mux") return null;
  const ms = build.progressOutTimeMs;
  if (ms == null || ms <= 0) return null;
  // ffmpeg out_time during transcode is media position (≪ 1 day in ms).
  if (ms <= 86_400_000) return null;
  return ms;
}

function resolveMuxElapsedSeconds(build: BuildEtaInput, now: number): number {
  const muxStartedMs = resolveMuxPhaseStartedMs(build);
  if (muxStartedMs != null) {
    return Math.max(0, (now - muxStartedMs) / 1000);
  }

  if (build.updatedAt) {
    return Math.min(120, Math.max(0, (now - Date.parse(build.updatedAt)) / 1000));
  }

  return 0;
}

function extractMuxPercentFromMessage(
  message: string | null | undefined,
): number | null {
  if (!message) return null;
  const match = message.match(/Сборка MKV\s+(\d+)%/i);
  if (!match) return null;
  const pct = Number(match[1]);
  return Number.isFinite(pct) ? pct : null;
}

function extractSpeedFromMessage(message: string | null | undefined): string | null {
  if (!message) return null;
  const match = message.match(/\(([0-9.]+)x\)/);
  return match?.[1] ? `${match[1]}x` : null;
}

export function estimateQueuedWaitSeconds(
  build: Pick<
    SerializedBuild,
    "status" | "queueOrder" | "id" | "requiresTranscode"
  >,
  allItems: SerializedBuild[],
  now = Date.now(),
): number | null {
  if (build.status !== "QUEUED") return null;

  const laneItems = allItems.filter(
    (item) => item.requiresTranscode === build.requiresTranscode,
  );

  const sorted = [...laneItems].sort((a, b) => {
    if (a.status === "RUNNING" && b.status !== "RUNNING") return -1;
    if (b.status === "RUNNING" && a.status !== "RUNNING") return 1;
    if (a.status === "QUEUED" && b.status === "QUEUED") {
      return a.queueOrder - b.queueOrder || a.id - b.id;
    }
    return 0;
  });

  let waitSeconds = 0;

  for (const item of sorted) {
    if (item.id === build.id) break;

    if (item.status === "RUNNING") {
      waitSeconds += estimateRunningRemainingSeconds(item, now) ?? estimateRecipeDurationSeconds(item);
      continue;
    }

    if (item.status === "QUEUED") {
      waitSeconds += estimateRecipeDurationSeconds(item);
    }
  }

  return waitSeconds;
}

export function buildRunningEtaLabel(
  build: BuildEtaInput,
  now = Date.now(),
): string | null {
  const seconds = estimateRunningRemainingSeconds(build, now);
  const formatted = formatBuildEtaSeconds(seconds);
  return formatted ? `осталось ${formatted}` : null;
}

export function buildQueuedEtaLabel(
  build: BuildEtaInput,
  allItems: SerializedBuild[],
  now = Date.now(),
): string | null {
  if (build.status !== "QUEUED") return null;

  const waitSeconds = estimateQueuedWaitSeconds(build, allItems, now);
  const waitLabel = formatBuildEtaSeconds(waitSeconds);
  const totalSeconds =
    waitSeconds != null
      ? waitSeconds + estimateRecipeDurationSeconds(build)
      : estimateRecipeDurationSeconds(build);
  const totalLabel = formatBuildEtaSeconds(totalSeconds);

  if (waitLabel && waitSeconds != null && waitSeconds > 0) {
    return totalLabel ? `до старта ${waitLabel} · всего ${totalLabel}` : `до старта ${waitLabel}`;
  }

  return totalLabel ? `~${totalLabel.replace(/^~/, "")} на сборку` : null;
}

function clamp01(value: number): number {
  if (value <= 0) return 0;
  if (value >= 1) return 1;
  return value;
}
