import { DURATION_WARNING_THRESHOLD_SECONDS } from "@/lib/builds/build-presets";
import type { ReleaseWithTracks } from "@/lib/movies/movie-include";
import type { BuildRecipeTrackState } from "@/lib/builds/build-recipe-state";
import { formatDurationField } from "@/lib/shared/duration";
import { formatDuration, formatDurationDelta } from "@/lib/shared/duration-format";

export type DurationMismatchSeverity = "minor" | "moderate" | "critical";

export interface DurationMismatchInfo {
  deltaSeconds: number;
  videoDurationSeconds: number;
  audioDurationSeconds: number;
  /** Audio is shorter than the video source release. */
  audioShorter: boolean;
  severity: DurationMismatchSeverity;
}

export const DURATION_MISMATCH_SEVERITY_LABEL: Record<
  DurationMismatchSeverity,
  string
> = {
  minor: "незначительный",
  moderate: "заметный",
  critical: "критичный",
};

export const DURATION_MISMATCH_SEVERITY_TONE: Record<
  DurationMismatchSeverity,
  string
> = {
  minor: "text-muted",
  moderate: "text-ember-bright",
  critical: "text-danger",
};

/** Human-readable delta for inline badges (seconds or minutes). */
export { formatDurationDelta } from "@/lib/shared/duration-format";

export function durationMismatchSeverity(
  deltaSeconds: number,
): DurationMismatchSeverity {
  if (deltaSeconds <= 5) return "minor";
  if (deltaSeconds <= 60) return "moderate";
  return "critical";
}

export function computeDurationMismatch(
  videoDurationSeconds: number | null | undefined,
  audioDurationSeconds: number | null | undefined,
): DurationMismatchInfo | null {
  if (
    videoDurationSeconds == null ||
    audioDurationSeconds == null ||
    videoDurationSeconds <= 0 ||
    audioDurationSeconds <= 0
  ) {
    return null;
  }
  const deltaSeconds = Math.abs(audioDurationSeconds - videoDurationSeconds);
  if (deltaSeconds <= DURATION_WARNING_THRESHOLD_SECONDS) return null;
  return {
    deltaSeconds,
    videoDurationSeconds,
    audioDurationSeconds,
    audioShorter: audioDurationSeconds < videoDurationSeconds,
    severity: durationMismatchSeverity(deltaSeconds),
  };
}

export function buildSourceTrackKey(
  releaseId: number,
  kind: BuildRecipeTrackState["kind"],
  streamIndex: number,
): string {
  return `${releaseId}:${kind}:${streamIndex}`;
}

/** Client-side duration hints for audio tracks vs the selected video source. */
export function computeAudioDurationMismatchMap(
  tracks: BuildRecipeTrackState[],
  releases: ReleaseWithTracks[],
): Map<string, DurationMismatchInfo> {
  const video = tracks.find((t) => t.kind === "video");
  if (!video) return new Map();

  const videoRelease = releases.find((r) => r.id === video.sourceReleaseId);
  const videoDuration = videoRelease?.durationSeconds ?? null;

  const map = new Map<string, DurationMismatchInfo>();
  for (const track of tracks) {
    if (track.kind !== "audio") continue;
    const audioRelease = releases.find((r) => r.id === track.sourceReleaseId);
    const mismatch = computeDurationMismatch(
      videoDuration,
      audioRelease?.durationSeconds ?? null,
    );
    if (!mismatch) continue;
    map.set(
      buildSourceTrackKey(track.sourceReleaseId, "audio", track.sourceStreamIndex),
      mismatch,
    );
  }
  return map;
}

/** Precise duration for mismatch tooltips (includes seconds). */
export function formatDurationPrecise(seconds: number): string {
  return formatDuration(seconds, "hms") ?? "";
}

export function durationMismatchInlineLabel(info: DurationMismatchInfo): string {
  const direction = info.audioShorter ? "короче на" : "длиннее на";
  return `${direction} ${formatDurationDelta(info.deltaSeconds)} · ${DURATION_MISMATCH_SEVERITY_LABEL[info.severity]}`;
}

export function durationMismatchTooltipLines(info: DurationMismatchInfo): {
  headline: string;
  detail: string;
} {
  const direction = info.audioShorter ? "короче видео" : "длиннее видео";
  return {
    headline: `Аудио ${direction} на ${formatDurationDelta(info.deltaSeconds)}`,
    detail: `Видео ${formatDurationPrecise(info.videoDurationSeconds)} · аудио ${formatDurationPrecise(info.audioDurationSeconds)}`,
  };
}
