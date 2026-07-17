import type { SerializedBuild } from "@/lib/builds/build-serialize";
import { parseFfmpegSpeed } from "@/lib/builds/build-ffmpeg";

const DEFAULT_TRANSCODE_SPEED = 1;
const PREPARE_ETA_SECONDS = 30;
const FINALIZE_ETA_SECONDS = 45;
const MUX_ETA_SECONDS = 120;
const MUX_ETA_PER_HOUR = 90;

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
  | "queueOrder"
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

export function estimateMuxRemainingSeconds(
  progressPercent: number | null | undefined,
): number {
  if (progressPercent == null) return MUX_ETA_SECONDS;
  const muxProgress = clamp01((progressPercent - 60) / 30);
  return Math.max(5, (1 - muxProgress) * MUX_ETA_SECONDS);
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
  const muxSeconds = Math.max(
    MUX_ETA_SECONDS,
    Math.round((durationSeconds / 3600) * MUX_ETA_PER_HOUR),
  );

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
    return estimateTranscodeRemainingSeconds(build, durationSeconds);
  }

  if (phase === "mux") {
    return Math.round(estimateMuxRemainingSeconds(build.progressPercent) + FINALIZE_ETA_SECONDS);
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
        MUX_ETA_SECONDS +
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

  const outTimeMs = Math.max(0, build.progressOutTimeMs ?? 0);
  const currentRemainingSec = Math.max(
    0,
    (durationMs - outTimeMs) / 1000 / Math.max(speed, 0.05),
  );

  const stepTotal = build.progressStepTotal ?? countTranscodeTracks(build);
  const stepIndex = build.progressStepIndex ?? 0;
  const remainingTracks = Math.max(0, stepTotal - stepIndex - 1);
  const trackDurationSec = durationMs / 1000;

  return Math.round(
    currentRemainingSec +
      remainingTracks * estimateTranscodeTrackSeconds(trackDurationSec, speed) +
      MUX_ETA_SECONDS +
      FINALIZE_ETA_SECONDS,
  );
}

function extractSpeedFromMessage(message: string | null | undefined): string | null {
  if (!message) return null;
  const match = message.match(/\(([0-9.]+)x\)/);
  return match?.[1] ? `${match[1]}x` : null;
}

export function estimateQueuedWaitSeconds(
  build: Pick<SerializedBuild, "status" | "queueOrder" | "id">,
  allItems: SerializedBuild[],
  now = Date.now(),
): number | null {
  if (build.status !== "QUEUED") return null;

  const sorted = [...allItems].sort((a, b) => {
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

export function formatBuildEtaSeconds(seconds: number | null | undefined): string | null {
  if (seconds == null || !Number.isFinite(seconds)) return null;

  const total = Math.max(0, Math.round(seconds));
  if (total < 45) return "меньше минуты";

  const hours = Math.floor(total / 3600);
  const minutes = Math.ceil((total % 3600) / 60);

  if (hours <= 0) {
    return `~${Math.max(1, minutes)} мин`;
  }

  if (minutes <= 0) {
    return hours === 1 ? "~1 ч" : `~${hours} ч`;
  }

  return hours === 1 ? `~1 ч ${minutes} мин` : `~${hours} ч ${minutes} мин`;
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
