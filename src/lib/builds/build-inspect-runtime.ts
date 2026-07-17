import { execa } from "execa";
import { access } from "fs/promises";
import { prisma } from "@/lib/db/prisma";
import { probeMediaFile } from "@/lib/media/ffprobe";
import type { FfprobeStream } from "@/lib/media/ffprobe-parse";
import {
  ffprobeOrdinalAmongType,
  parseMkvIdentifyJson,
  resolveMkvTrackIdByOrdinal,
  type MkvIdentifyResult,
} from "@/lib/builds/build-inspection";
import { resolveFfprobeGlobalStreamIndex } from "@/lib/builds/build-stream-resolve";
import { DURATION_WARNING_THRESHOLD_SECONDS } from "@/lib/builds/build-presets";

export interface CatalogStreamRefs {
  videoStreamIndex: number | null;
  audioTracks: { streamIndex: number }[];
  subtitleTracks: { streamIndex: number }[];
}

export interface InspectedReleaseFile {
  releaseId: number;
  filePath: string;
  durationSeconds: number | null;
  exactDurationSeconds: number | null;
  probe: Awaited<ReturnType<typeof probeMediaFile>>;
  mkv: MkvIdentifyResult | null;
  ffprobeStreams: FfprobeStream[];
  /** Track identity keys from release DB — may differ from probe streamIndex convention. */
  catalog: CatalogStreamRefs;
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

  const release = await prisma.release.findUnique({
    where: { id: releaseId },
    select: {
      videoTrack: { select: { streamIndex: true } },
      audioTracks: { select: { streamIndex: true }, orderBy: { id: "asc" } },
      subtitleTracks: { select: { streamIndex: true }, orderBy: { id: "asc" } },
    },
  });

  return {
    releaseId,
    filePath,
    durationSeconds: probe.durationSeconds,
    exactDurationSeconds,
    probe,
    mkv,
    ffprobeStreams,
    catalog: {
      videoStreamIndex: release?.videoTrack?.streamIndex ?? null,
      audioTracks: release?.audioTracks ?? [],
      subtitleTracks: release?.subtitleTracks ?? [],
    },
  };
}

export function resolveMkvTrackIdForStream(
  inspected: InspectedReleaseFile,
  kind: "video" | "audio" | "subtitle",
  streamRef: number,
): number | null {
  if (!inspected.mkv) return null;
  const probeTracks =
    kind === "video"
      ? inspected.probe.video
        ? [inspected.probe.video]
        : []
      : kind === "audio"
        ? inspected.probe.audio
        : inspected.probe.subtitles;
  const catalogTracks =
    kind === "video"
      ? inspected.catalog.videoStreamIndex != null
        ? [{ streamIndex: inspected.catalog.videoStreamIndex }]
        : []
      : kind === "audio"
        ? inspected.catalog.audioTracks
        : inspected.catalog.subtitleTracks;
  const globalIndex = resolveFfprobeGlobalStreamIndex(
    inspected.ffprobeStreams,
    kind,
    streamRef,
    probeTracks,
    catalogTracks,
  );
  if (globalIndex == null) return null;
  const ordinal = ffprobeOrdinalAmongType(
    inspected.ffprobeStreams,
    globalIndex,
    kind,
  );
  if (ordinal < 0) {
    const sortedProbe = [...probeTracks].sort(
      (a, b) => a.streamIndex - b.streamIndex,
    );
    const probeOrdinal = sortedProbe.findIndex(
      (t) => t.streamIndex === globalIndex,
    );
    if (probeOrdinal < 0) return null;
    return resolveMkvTrackIdByOrdinal(inspected.mkv.tracks, kind, probeOrdinal);
  }
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
