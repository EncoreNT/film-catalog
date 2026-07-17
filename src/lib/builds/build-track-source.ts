import type { BuildRecipeTrackState, BuildTrackKind } from "@/lib/builds/build-recipe-state";
import type { ReleaseWithTracks } from "@/lib/movies/movie-include";
import { sourceTrackLabel } from "@/lib/builds/build-display";

export type CatalogSourceTrack =
  | NonNullable<ReleaseWithTracks["videoTrack"]>
  | ReleaseWithTracks["audioTracks"][number]
  | ReleaseWithTracks["subtitleTracks"][number];

export interface BuildTrackRef {
  kind: BuildTrackKind | string;
  sourceReleaseId: number;
  sourceStreamIndex: number;
}

export function normalizeBuildTrackKind(kind: string): BuildTrackKind {
  const normalized = kind.toLowerCase();
  if (normalized === "video" || normalized === "audio" || normalized === "subtitle") {
    return normalized;
  }
  return "subtitle";
}

export function findTrackByStreamIndex<T extends { streamIndex: number }>(
  tracks: readonly T[],
  sourceStreamIndex: number,
): T | undefined {
  return tracks.find((track) => track.streamIndex === sourceStreamIndex);
}

/**
 * Builder / catalog UI: resolve a track row by the identity key stored in the recipe.
 * `sourceStreamIndex` is always the catalog `streamIndex` value shown when the user picks a deck card.
 */
export function resolveCatalogAudioTrack(
  release:
    | Pick<ReleaseWithTracks, "audioTracks">
    | null
    | undefined,
  sourceStreamIndex: number,
): ReleaseWithTracks["audioTracks"][number] | null {
  if (!release) return null;
  return findTrackByStreamIndex(release.audioTracks, sourceStreamIndex) ?? null;
}

export function resolveCatalogSubtitleTrack(
  release:
    | Pick<ReleaseWithTracks, "subtitleTracks">
    | null
    | undefined,
  sourceStreamIndex: number,
): ReleaseWithTracks["subtitleTracks"][number] | null {
  if (!release) return null;
  return findTrackByStreamIndex(release.subtitleTracks, sourceStreamIndex) ?? null;
}

export function resolveCatalogVideoTrack(
  release:
    | Pick<ReleaseWithTracks, "videoTrack">
    | null
    | undefined,
  sourceStreamIndex: number,
): NonNullable<ReleaseWithTracks["videoTrack"]> | null {
  if (!release?.videoTrack) return null;
  if (release.videoTrack.streamIndex !== sourceStreamIndex) return null;
  return release.videoTrack;
}

export function resolveCatalogTrack(
  release:
    | Pick<ReleaseWithTracks, "videoTrack" | "audioTracks" | "subtitleTracks">
    | null
    | undefined,
  kind: BuildTrackKind,
  sourceStreamIndex: number,
): CatalogSourceTrack | null {
  if (!release) return null;

  if (kind === "video") {
    return resolveCatalogVideoTrack(release, sourceStreamIndex);
  }

  if (kind === "audio") {
    return resolveCatalogAudioTrack(release, sourceStreamIndex);
  }

  return resolveCatalogSubtitleTrack(release, sourceStreamIndex);
}

export function resolveCatalogTrackFromRef(
  release:
    | Pick<ReleaseWithTracks, "videoTrack" | "audioTracks" | "subtitleTracks">
    | null
    | undefined,
  track: BuildTrackRef,
): CatalogSourceTrack | null {
  return resolveCatalogTrack(
    release,
    normalizeBuildTrackKind(track.kind),
    track.sourceStreamIndex,
  );
}

/** Create a recipe track when the user picks a card in the builder decks. */
export function buildRecipeTrackFromCatalogPick(
  release: ReleaseWithTracks,
  kind: BuildTrackKind,
  sourceStreamIndex: number,
): BuildRecipeTrackState | null {
  const source = resolveCatalogTrack(release, kind, sourceStreamIndex);
  if (!source) return null;

  if (kind === "video") {
    return {
      key: crypto.randomUUID(),
      kind: "video",
      sourceReleaseId: release.id,
      sourceStreamIndex,
      label: sourceTrackLabel(source, "video"),
    };
  }

  if (kind === "audio") {
    const audio = source as ReleaseWithTracks["audioTracks"][number];
    return {
      key: crypto.randomUUID(),
      kind: "audio",
      sourceReleaseId: release.id,
      sourceStreamIndex,
      label: sourceTrackLabel(audio, "audio"),
      audioMode: "copy",
      offsetMs: 0,
      transcodeCodec: "eac3",
      transcodeBitrate: 768,
      channelTarget: "up_to_51",
      isDefault: audio.isDefault,
    };
  }

  const subtitle = source as ReleaseWithTracks["subtitleTracks"][number];
  return {
    key: crypto.randomUUID(),
    kind: "subtitle",
    sourceReleaseId: release.id,
    sourceStreamIndex,
    label: sourceTrackLabel(subtitle, "subtitle"),
    forced: subtitle.forced,
    isDefault: subtitle.isDefault,
  };
}
