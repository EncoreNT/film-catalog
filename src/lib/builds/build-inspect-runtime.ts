import { execa } from "execa";
import { access } from "fs/promises";
import { probeMediaFile } from "@/lib/media/ffprobe";
import type { FfprobeStream } from "@/lib/media/ffprobe-parse";
import {
  ffprobeOrdinalAmongType,
  parseMkvIdentifyJson,
  resolveMkvTrackIdByOrdinal,
  type MkvIdentifyResult,
} from "@/lib/builds/build-inspection";
import { DURATION_WARNING_THRESHOLD_SECONDS } from "@/lib/builds/build-presets";

export interface InspectedReleaseFile {
  releaseId: number;
  filePath: string;
  durationSeconds: number | null;
  exactDurationSeconds: number | null;
  probe: Awaited<ReturnType<typeof probeMediaFile>>;
  mkv: MkvIdentifyResult | null;
  ffprobeStreams: FfprobeStream[];
}

export interface BuildWarning {
  code: string;
  message: string;
  severity: "warning" | "error";
  details?: Record<string, unknown>;
}

export async function fileIsReadable(filePath: string): Promise<boolean> {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

export async function inspectReleaseFile(
  releaseId: number,
  filePath: string,
  signal?: AbortSignal,
): Promise<InspectedReleaseFile> {
  if (!(await fileIsReadable(filePath))) {
    throw new Error(`Файл недоступен: ${filePath}`);
  }

  const probe = await probeMediaFile(filePath, signal);

  let mkv: MkvIdentifyResult | null = null;
  let ffprobeStreams: FfprobeStream[] = [];
  try {
    const { stdout } = await execa("mkvmerge", ["-J", filePath], {
      cancelSignal: signal,
      timeout: 60_000,
    });
    mkv = parseMkvIdentifyJson(stdout);
  } catch {
    mkv = null;
  }

  try {
    const { stdout } = await execa(
      "ffprobe",
      ["-v", "quiet", "-print_format", "json", "-show_streams", filePath],
      { cancelSignal: signal },
    );
    const data = JSON.parse(stdout) as { streams?: FfprobeStream[] };
    ffprobeStreams = data.streams ?? [];
  } catch {
    ffprobeStreams = [];
  }

  const exactDurationSeconds = mkv?.container.duration ?? probe.durationSeconds;

  return {
    releaseId,
    filePath,
    durationSeconds: probe.durationSeconds,
    exactDurationSeconds,
    probe,
    mkv,
    ffprobeStreams,
  };
}

export function resolveMkvTrackIdForStream(
  inspected: InspectedReleaseFile,
  kind: "video" | "audio" | "subtitle",
  ffprobeStreamIndex: number,
): number | null {
  if (!inspected.mkv) return null;
  const ordinal = ffprobeOrdinalAmongType(
    inspected.ffprobeStreams,
    ffprobeStreamIndex,
    kind,
  );
  if (ordinal < 0) return null;
  return resolveMkvTrackIdByOrdinal(inspected.mkv.tracks, kind, ordinal);
}

export function durationDeltaWarnings(
  videoDuration: number | null,
  audioDuration: number | null,
  audioLabel: string,
): BuildWarning[] {
  if (videoDuration == null || audioDuration == null) return [];
  const delta = Math.abs(audioDuration - videoDuration);
  if (delta <= DURATION_WARNING_THRESHOLD_SECONDS) return [];
  return [
    {
      code: "duration_mismatch",
      message: `Длительность аудио «${audioLabel}» отличается от видео на ${delta.toFixed(2)} с`,
      severity: "warning",
      details: {
        videoDurationSeconds: videoDuration,
        audioDurationSeconds: audioDuration,
        deltaSeconds: delta,
      },
    },
  ];
}
