import type { BuildTrackKind } from "@/lib/builds/build-recipe-state";
import type { InspectedReleaseFile } from "@/lib/builds/build-inspect-runtime";
import { resolveMkvTrackIdForStream } from "@/lib/builds/build-inspect-runtime";
import {
  ffprobeOrdinalAmongType,
  resolveMkvTrackIdByOrdinal,
} from "@/lib/builds/build-inspection";
import {
  resolveFfprobeGlobalStreamIndex,
  resolveProbeAudioTrack,
  resolveProbeSubtitleTrack,
} from "@/lib/builds/build-stream-resolve";

function catalogTracksForKind(
  inspected: InspectedReleaseFile,
  kind: BuildTrackKind,
): { streamIndex: number }[] {
  if (kind === "video") {
    return inspected.catalog.videoStreamIndex != null
      ? [{ streamIndex: inspected.catalog.videoStreamIndex }]
      : [];
  }
  if (kind === "audio") {
    return inspected.catalog.audioTracks;
  }
  return inspected.catalog.subtitleTracks;
}

/** Validate / run: map recipe ref to ffprobe global stream index on a live file. */
export function resolveInspectedGlobalStreamIndex(
  inspected: InspectedReleaseFile,
  kind: BuildTrackKind,
  sourceStreamIndex: number,
): number | null {
  const probeTracks =
    kind === "video"
      ? inspected.probe.video
        ? [inspected.probe.video]
        : []
      : kind === "audio"
        ? inspected.probe.audio
        : inspected.probe.subtitles;

  return resolveFfprobeGlobalStreamIndex(
    inspected.ffprobeStreams,
    kind,
    sourceStreamIndex,
    probeTracks,
    catalogTracksForKind(inspected, kind),
  );
}

export function resolveInspectedAudioTrack(
  inspected: InspectedReleaseFile,
  sourceStreamIndex: number,
) {
  return resolveProbeAudioTrack(
    inspected.probe,
    inspected.ffprobeStreams,
    sourceStreamIndex,
    inspected.catalog.audioTracks,
  );
}

export function resolveInspectedSubtitleTrack(
  inspected: InspectedReleaseFile,
  sourceStreamIndex: number,
) {
  return resolveProbeSubtitleTrack(
    inspected.probe,
    inspected.ffprobeStreams,
    sourceStreamIndex,
    inspected.catalog.subtitleTracks,
  );
}

export function resolveInspectedMkvTrackId(
  inspected: InspectedReleaseFile,
  kind: BuildTrackKind,
  sourceStreamIndex: number,
): number | null {
  return resolveMkvTrackIdForStream(inspected, kind, sourceStreamIndex);
}

/** ffmpeg `-map 0:a:N` ordinal for a recipe audio track. */
export function resolveFfmpegAudioOrdinal(
  inspected: InspectedReleaseFile,
  sourceStreamIndex: number,
): number {
  const globalAudioIndex = resolveInspectedGlobalStreamIndex(
    inspected,
    "audio",
    sourceStreamIndex,
  );
  if (globalAudioIndex == null) {
    throw new Error(`Аудиопоток ${sourceStreamIndex} не найден`);
  }

  let audioOrdinal = ffprobeOrdinalAmongType(
    inspected.ffprobeStreams,
    globalAudioIndex,
    "audio",
  );
  if (audioOrdinal < 0) {
    const sortedAudio = [...inspected.probe.audio].sort(
      (a, b) => a.streamIndex - b.streamIndex,
    );
    audioOrdinal = sortedAudio.findIndex(
      (track) => track.streamIndex === globalAudioIndex,
    );
  }
  if (audioOrdinal < 0) {
    throw new Error(`Аудиопоток ${sourceStreamIndex} не найден`);
  }
  return audioOrdinal;
}

/** Map global ffprobe stream index to mkvmerge track id inside a file. */
export function resolveMkvTrackIdFromGlobalIndex(
  inspected: InspectedReleaseFile,
  kind: BuildTrackKind,
  globalStreamIndex: number,
): number | null {
  if (!inspected.mkv) return null;

  let ordinal = ffprobeOrdinalAmongType(
    inspected.ffprobeStreams,
    globalStreamIndex,
    kind,
  );
  if (ordinal < 0) {
    const probeTracks =
      kind === "video"
        ? inspected.probe.video
          ? [inspected.probe.video]
          : []
        : kind === "audio"
          ? inspected.probe.audio
          : inspected.probe.subtitles;
    const sortedProbe = [...probeTracks].sort(
      (a, b) => a.streamIndex - b.streamIndex,
    );
    ordinal = sortedProbe.findIndex((track) => track.streamIndex === globalStreamIndex);
  }
  if (ordinal < 0) return null;
  return resolveMkvTrackIdByOrdinal(inspected.mkv.tracks, kind, ordinal);
}
