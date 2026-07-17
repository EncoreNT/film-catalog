import type { ReleaseWithTracks } from "@/lib/movies/movie-include";
import type { SerializedBuild } from "@/lib/builds/build-serialize";
import type {
  BuildRecipeTrackState,
  BuildTrackKind,
} from "@/lib/builds/build-recipe-state";
import { formatArchiveTotalSize } from "@/lib/shared/format";

export type BuildSizeConfidence = "high" | "medium" | "low";

export interface BuildSizeEstimate {
  totalBytes: number;
  /** Known on-disk size of finished file (SUCCEEDED + registered release). */
  actual?: boolean;
  confidence: BuildSizeConfidence;
  breakdown: {
    videoBytes: number;
    audioBytes: number;
    subtitleBytes: number;
    overheadBytes: number;
  };
}

export interface BuildSizeTrackInput {
  kind: BuildTrackKind | Uppercase<BuildTrackKind>;
  sourceReleaseId: number;
  sourceStreamIndex: number;
  audioMode?: "copy" | "transcode" | "COPY" | "TRANSCODE" | null;
  transcodeBitrate?: number | null;
  keepOriginal?: boolean;
}

type BuildSizeReleaseInput = Pick<
  ReleaseWithTracks,
  "id" | "durationSeconds" | "fileSize" | "videoTrack" | "audioTracks" | "subtitleTracks"
>;

const SUBTITLE_BYTES_ESTIMATE = 80_000;
const MKV_OVERHEAD_RATIO = 0.03;
const FALLBACK_AUDIO_KBPS = 640;

function normalizeKind(
  kind: BuildSizeTrackInput["kind"],
): BuildTrackKind {
  return kind.toLowerCase() as BuildTrackKind;
}

function normalizeAudioMode(
  mode: BuildSizeTrackInput["audioMode"],
): "copy" | "transcode" {
  return mode?.toLowerCase() === "transcode" ? "transcode" : "copy";
}

/** Bitrate in DB is kbps; duration in seconds. */
export function kbpsDurationToBytes(
  kbps: number,
  durationSeconds: number,
): number {
  if (kbps <= 0 || durationSeconds <= 0) return 0;
  return Math.round((kbps * 1000 * durationSeconds) / 8);
}

function releaseMap(
  releases: BuildSizeReleaseInput[],
): Map<number, BuildSizeReleaseInput> {
  return new Map(releases.map((r) => [r.id, r]));
}

function estimateVideoBytes(
  release: BuildSizeReleaseInput,
  durationSeconds: number,
): { bytes: number; confidence: BuildSizeConfidence } {
  const bitrate = release.videoTrack?.bitrate;
  if (bitrate != null && bitrate > 0) {
    return {
      bytes: kbpsDurationToBytes(bitrate, durationSeconds),
      confidence: "high",
    };
  }

  if (release.fileSize != null && release.fileSize > 0) {
    const audioBytes = release.audioTracks.reduce(
      (sum, track) =>
        track.bitrate != null && track.bitrate > 0
          ? sum + kbpsDurationToBytes(track.bitrate, durationSeconds)
          : sum,
      0,
    );
    const subtitleBytes =
      release.subtitleTracks.length * SUBTITLE_BYTES_ESTIMATE;
    const remainder = release.fileSize - audioBytes - subtitleBytes;
    if (remainder > 0) {
      return {
        bytes: Math.round(remainder * 0.92),
        confidence: audioBytes > 0 ? "medium" : "low",
      };
    }
    return {
      bytes: Math.round(release.fileSize * 0.85),
      confidence: "low",
    };
  }

  return { bytes: 0, confidence: "low" };
}

function estimateAudioBytes(
  release: BuildSizeReleaseInput,
  streamIndex: number,
  durationSeconds: number,
  track: BuildSizeTrackInput,
): { bytes: number; confidence: BuildSizeConfidence } {
  const audio = release.audioTracks.find((a) => a.streamIndex === streamIndex);
  const mode = normalizeAudioMode(track.audioMode);

  if (mode === "transcode") {
    const transcodeKbps = track.transcodeBitrate ?? 768;
    let bytes = kbpsDurationToBytes(transcodeKbps, durationSeconds);
    let confidence: BuildSizeConfidence = "high";

    if (track.keepOriginal) {
      if (audio?.bitrate != null && audio.bitrate > 0) {
        bytes += kbpsDurationToBytes(audio.bitrate, durationSeconds);
      } else {
        bytes += kbpsDurationToBytes(FALLBACK_AUDIO_KBPS, durationSeconds);
        confidence = "medium";
      }
    }

    return { bytes, confidence };
  }

  if (audio?.bitrate != null && audio.bitrate > 0) {
    return {
      bytes: kbpsDurationToBytes(audio.bitrate, durationSeconds),
      confidence: "high",
    };
  }

  return {
    bytes: kbpsDurationToBytes(FALLBACK_AUDIO_KBPS, durationSeconds),
    confidence: "low",
  };
}

function mergeConfidence(
  values: BuildSizeConfidence[],
): BuildSizeConfidence {
  if (values.includes("low")) return "low";
  if (values.includes("medium")) return "medium";
  return "high";
}

export function estimateBuildOutputSize(
  tracks: BuildSizeTrackInput[],
  releases: BuildSizeReleaseInput[],
  options?: { actualFileSizeBytes?: number | null },
): BuildSizeEstimate | null {
  if (options?.actualFileSizeBytes != null && options.actualFileSizeBytes > 0) {
    return {
      totalBytes: options.actualFileSizeBytes,
      actual: true,
      confidence: "high",
      breakdown: {
        videoBytes: 0,
        audioBytes: 0,
        subtitleBytes: 0,
        overheadBytes: 0,
      },
    };
  }

  const videoTrack = tracks.find((t) => normalizeKind(t.kind) === "video");
  if (!videoTrack) return null;

  const releasesById = releaseMap(releases);
  const videoRelease = releasesById.get(videoTrack.sourceReleaseId);
  const durationSeconds = videoRelease?.durationSeconds ?? null;
  if (durationSeconds == null || durationSeconds <= 0) return null;

  let videoBytes = 0;
  let audioBytes = 0;
  let subtitleBytes = 0;
  const confidences: BuildSizeConfidence[] = [];

  for (const track of tracks) {
    const release = releasesById.get(track.sourceReleaseId);
    if (!release) continue;

    const kind = normalizeKind(track.kind);
    if (kind === "video") {
      const estimate = estimateVideoBytes(release, durationSeconds);
      videoBytes += estimate.bytes;
      confidences.push(estimate.confidence);
      continue;
    }

    if (kind === "audio") {
      const estimate = estimateAudioBytes(
        release,
        track.sourceStreamIndex,
        durationSeconds,
        track,
      );
      audioBytes += estimate.bytes;
      confidences.push(estimate.confidence);
      continue;
    }

    subtitleBytes += SUBTITLE_BYTES_ESTIMATE;
    confidences.push("high");
  }

  const rawTotal = videoBytes + audioBytes + subtitleBytes;
  if (rawTotal <= 0) return null;

  const overheadBytes = Math.round(rawTotal * MKV_OVERHEAD_RATIO);
  return {
    totalBytes: rawTotal + overheadBytes,
    confidence: mergeConfidence(confidences),
    breakdown: {
      videoBytes,
      audioBytes,
      subtitleBytes,
      overheadBytes,
    },
  };
}

export function estimateBuildOutputSizeFromRecipe(
  tracks: BuildRecipeTrackState[],
  releases: ReleaseWithTracks[],
): BuildSizeEstimate | null {
  return estimateBuildOutputSize(tracks, releases);
}

export function estimateBuildOutputSizeFromBuild(
  build: SerializedBuild,
): BuildSizeEstimate | null {
  const actualSize = build.outputRelease?.fileSize ?? null;
  const releases = build.sources.flatMap((source) =>
    source.release ? [source.release] : [],
  );
  const tracks = build.tracks.flatMap((track) =>
    track.sourceReleaseId != null
      ? [
          {
            kind: track.kind,
            sourceReleaseId: track.sourceReleaseId,
            sourceStreamIndex: track.sourceStreamIndex,
            audioMode: track.audioMode,
            transcodeBitrate: track.transcodeBitrate,
            keepOriginal: track.keepOriginal,
          },
        ]
      : [],
  );

  return estimateBuildOutputSize(tracks, releases, {
    actualFileSizeBytes: actualSize,
  });
}

export function formatBuildOutputSizeLabel(
  estimate: BuildSizeEstimate | null,
): string | null {
  if (!estimate) return null;
  const formatted = formatArchiveTotalSize(estimate.totalBytes);
  if (!formatted) return null;
  return estimate.actual ? formatted : `≈ ${formatted}`;
}

export function buildOutputSizeHint(
  estimate: BuildSizeEstimate | null,
): string | null {
  if (!estimate || estimate.actual) return null;
  if (estimate.confidence === "high") {
    return "оценка по битрейтам дорожек";
  }
  if (estimate.confidence === "medium") {
    return "часть дорожек оценена по размеру исходника";
  }
  return "грубая оценка — уточнится после сборки";
}
