import type { ProbeResult } from "@/lib/media/ffprobe";
import type {
  ProbedAudioTrack,
  ProbedSubtitleTrack,
  FfprobeStream,
} from "@/lib/media/ffprobe-parse";

export type ProbeStreamKind = "video" | "audio" | "subtitle";

function streamsOfKind(
  streams: FfprobeStream[],
  kind: ProbeStreamKind,
): FfprobeStream[] {
  const codecType = kind === "subtitle" ? "subtitle" : kind;
  return streams
    .filter((s) => s.codec_type === codecType)
    .sort((a, b) => a.index - b.index);
}

type StreamRefTrack = { streamIndex: number };

export function catalogTracksMatchFfprobeOrder(
  catalogTracks: StreamRefTrack[],
  ofType: FfprobeStream[],
): boolean {
  if (catalogTracks.length === 0 || ofType.length === 0) return false;
  const sorted = [...catalogTracks].sort((a, b) => a.streamIndex - b.streamIndex);
  if (sorted.length !== ofType.length) {
    return sorted.every((track) =>
      ofType.some((stream) => stream.index === track.streamIndex),
    );
  }
  return sorted.every(
    (track, index) => track.streamIndex === ofType[index]?.index,
  );
}

function probeTracksMatchFfprobeOrder(
  probeTracks: StreamRefTrack[],
  ofType: FfprobeStream[],
): boolean {
  return catalogTracksMatchFfprobeOrder(probeTracks, ofType);
}

function resolveFromCatalogIdentity(
  ofType: FfprobeStream[],
  streamRef: number,
  catalogTracks: StreamRefTrack[],
): number | null {
  const sortedCatalog = [...catalogTracks].sort(
    (a, b) => a.streamIndex - b.streamIndex,
  );
  const catalogPosition = sortedCatalog.findIndex(
    (track) => track.streamIndex === streamRef,
  );
  if (catalogPosition < 0) return null;

  if (catalogTracksMatchFfprobeOrder(catalogTracks, ofType)) {
    return ofType.some((stream) => stream.index === streamRef) ? streamRef : null;
  }

  return ofType[catalogPosition]?.index ?? null;
}

/**
 * Catalog tracks may store either ffprobe global stream index (probe sync)
 * or a legacy ordinal among tracks of the same type (manual form save).
 *
 * `catalogTracks` — rows from release DB (`audioTracks`, `subtitleTracks`, …).
 * `probeTracks` — parsed ffprobe metadata from the live file (always global indices).
 */
export function resolveFfprobeGlobalStreamIndex(
  streams: FfprobeStream[],
  kind: ProbeStreamKind,
  streamRef: number,
  probeTracks?: StreamRefTrack[],
  catalogTracks?: StreamRefTrack[],
): number | null {
  const ofType = streamsOfKind(streams, kind);

  if (catalogTracks?.length && ofType.length > 0) {
    const fromCatalog = resolveFromCatalogIdentity(ofType, streamRef, catalogTracks);
    if (fromCatalog != null) return fromCatalog;
  }

  if (ofType.length === 0) {
    if (!probeTracks?.length) return null;
    const sorted = [...probeTracks].sort((a, b) => a.streamIndex - b.streamIndex);
    const byGlobalInProbe = sorted.find((t) => t.streamIndex === streamRef);
    if (byGlobalInProbe) return byGlobalInProbe.streamIndex;
    return sorted[streamRef]?.streamIndex ?? null;
  }

  if (probeTracks?.length) {
    const sortedProbe = [...probeTracks].sort(
      (a, b) => a.streamIndex - b.streamIndex,
    );
    const identityIdx = sortedProbe.findIndex(
      (track) => track.streamIndex === streamRef,
    );
    if (identityIdx >= 0) {
      if (probeTracksMatchFfprobeOrder(probeTracks, ofType)) {
        return streamRef;
      }
      if (identityIdx < ofType.length) {
        return ofType[identityIdx]!.index;
      }
    }
  }

  const globalFromFfprobe = ofType.some((s) => s.index === streamRef)
    ? streamRef
    : null;
  const globalFromOrdinal = ofType[streamRef]?.index ?? null;

  if (
    globalFromFfprobe != null &&
    globalFromOrdinal != null &&
    globalFromFfprobe !== globalFromOrdinal
  ) {
    const tracksMatchFfprobe =
      probeTracks != null && probeTracksMatchFfprobeOrder(probeTracks, ofType);
    return tracksMatchFfprobe ? globalFromFfprobe : globalFromOrdinal;
  }

  if (globalFromFfprobe != null) return globalFromFfprobe;
  if (globalFromOrdinal != null) return globalFromOrdinal;

  if (probeTracks?.length) {
    const sorted = [...probeTracks].sort((a, b) => a.streamIndex - b.streamIndex);
    const byGlobalInProbe = sorted.find((t) => t.streamIndex === streamRef);
    if (byGlobalInProbe) return byGlobalInProbe.streamIndex;
    return sorted[streamRef]?.streamIndex ?? null;
  }

  return null;
}

function resolveProbeTrackByGlobalIndex<T extends StreamRefTrack>(
  probeTracks: T[],
  streams: FfprobeStream[],
  kind: ProbeStreamKind,
  globalIndex: number,
  catalogTracks?: StreamRefTrack[],
): T | null {
  const ofType = streamsOfKind(streams, kind);
  const sorted = [...probeTracks].sort((a, b) => a.streamIndex - b.streamIndex);

  const orderSource = catalogTracks ?? probeTracks;
  if (catalogTracksMatchFfprobeOrder(orderSource, ofType)) {
    return probeTracks.find((track) => track.streamIndex === globalIndex) ?? null;
  }

  const ordinal = ofType.findIndex((stream) => stream.index === globalIndex);
  return ordinal >= 0 ? (sorted[ordinal] ?? null) : null;
}

export function resolveProbeAudioTrack(
  probe: Pick<ProbeResult, "audio">,
  streams: FfprobeStream[],
  streamRef: number,
  catalogTracks?: StreamRefTrack[],
): ProbedAudioTrack | null {
  const globalIndex = resolveFfprobeGlobalStreamIndex(
    streams,
    "audio",
    streamRef,
    probe.audio,
    catalogTracks,
  );
  if (globalIndex == null) return null;
  return resolveProbeTrackByGlobalIndex(
    probe.audio,
    streams,
    "audio",
    globalIndex,
    catalogTracks,
  );
}

export function resolveProbeSubtitleTrack(
  probe: Pick<ProbeResult, "subtitles">,
  streams: FfprobeStream[],
  streamRef: number,
  catalogTracks?: StreamRefTrack[],
): ProbedSubtitleTrack | null {
  const globalIndex = resolveFfprobeGlobalStreamIndex(
    streams,
    "subtitle",
    streamRef,
    probe.subtitles,
    catalogTracks,
  );
  if (globalIndex == null) return null;
  return resolveProbeTrackByGlobalIndex(
    probe.subtitles,
    streams,
    "subtitle",
    globalIndex,
    catalogTracks,
  );
}
