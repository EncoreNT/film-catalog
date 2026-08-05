import type { ReleaseWithTracks } from "@/lib/movies/movie-include";
import type { ChannelTarget, TranscodeCodec } from "@/lib/builds/build-presets";
import type { BuildAudioSyncMode } from "@/lib/builds/build-audio-sync";
import { normalizeAudioSyncMode } from "@/lib/builds/build-audio-sync";
import { pickPrimaryRelease } from "@/lib/releases/release-primary";

export type BuildTrackKind = "video" | "audio" | "subtitle";
export type BuildAudioMode = "copy" | "transcode";

export interface BuildRecipeTrackState {
  key: string;
  kind: BuildTrackKind;
  sourceReleaseId: number;
  sourceStreamIndex: number;
  label: string;
  /** Title from source/catalog when the track was added (mapping validation). */
  sourceLabel?: string;
  audioMode?: BuildAudioMode;
  transcodeCodec?: TranscodeCodec;
  transcodeBitrate?: number;
  channelTarget?: ChannelTarget;
  offsetMs?: number;
  audioSyncMode?: BuildAudioSyncMode;
  isDefault?: boolean;
  forced?: boolean;
  /** Для аудио-перекодирования: сохранить оригинальную дорожку (true) или заменить (false). */
  keepOriginal?: boolean;
}

export interface BuildRecipeFormState {
  tracks: BuildRecipeTrackState[];
  outputPath: string;
  outputReleaseType: string;
  outputVersion: string;
  externalStorageId: number | null;
}

export function createInitialBuildState(
  releases: ReleaseWithTracks[],
  baseReleaseId?: number | null,
): BuildRecipeFormState {
  const primary =
    pickPrimaryRelease(releases, baseReleaseId) ?? releases[0] ?? null;
  const tracks: BuildRecipeTrackState[] = [];

  if (!primary) {
    return {
      tracks: [],
      outputPath: "",
      outputReleaseType: "",
      outputVersion: "theatrical",
      externalStorageId: null,
    };
  }

  if (primary.videoTrack) {
    tracks.push({
      key: crypto.randomUUID(),
      kind: "video",
      sourceReleaseId: primary.id,
      sourceStreamIndex: primary.videoTrack.streamIndex,
      label: "Видео",
      sourceLabel: "Видео",
    });
  }

  for (const audio of primary.audioTracks ?? []) {
    const audioLabel =
      audio.title || audio.language || `Audio ${audio.streamIndex}`;
    tracks.push({
      key: crypto.randomUUID(),
      kind: "audio",
      sourceReleaseId: primary.id,
      sourceStreamIndex: audio.streamIndex,
      label: audioLabel,
      sourceLabel: audioLabel,
      audioMode: "copy",
      offsetMs: 0,
      audioSyncMode: "none",
      isDefault: audio.isDefault,
    });
  }

  for (const sub of primary.subtitleTracks ?? []) {
    const subLabel = sub.title || sub.language || `Sub ${sub.streamIndex}`;
    tracks.push({
      key: crypto.randomUUID(),
      kind: "subtitle",
      sourceReleaseId: primary.id,
      sourceStreamIndex: sub.streamIndex,
      label: subLabel,
      sourceLabel: subLabel,
      forced: sub.forced,
      isDefault: sub.isDefault,
    });
  }

  return {
    tracks: normalizeExclusiveDefaults(tracks),
    outputPath: "",
    outputReleaseType: primary?.releaseType ?? "",
    outputVersion: primary?.version ?? "theatrical",
    externalStorageId: primary?.externalStorageId ?? null,
  };
}

export function serializeBuildRecipe(state: BuildRecipeFormState) {
  return {
    tracks: state.tracks.map((track) => ({
      kind: track.kind,
      sourceReleaseId: track.sourceReleaseId,
      sourceStreamIndex: track.sourceStreamIndex,
      label: track.label,
      sourceLabel: track.sourceLabel ?? track.label,
      audioMode: track.kind === "audio" ? track.audioMode ?? "copy" : undefined,
      transcodeCodec:
        track.kind === "audio" && track.audioMode === "transcode"
          ? track.transcodeCodec
          : undefined,
      transcodeBitrate:
        track.kind === "audio" && track.audioMode === "transcode"
          ? track.transcodeBitrate
          : undefined,
      channelTarget:
        track.kind === "audio" && track.audioMode === "transcode"
          ? track.channelTarget
          : undefined,
      offsetMs:
        track.kind === "audio" && normalizeAudioSyncMode(track) === "shift"
          ? track.offsetMs ?? 0
          : track.kind === "audio"
            ? 0
            : undefined,
      audioSyncMode:
        track.kind === "audio" ? normalizeAudioSyncMode(track) : undefined,
      isDefault: track.isDefault,
      forced: track.forced,
      keepOriginal:
        track.kind === "audio" && track.audioMode === "transcode"
          ? track.keepOriginal ?? false
          : undefined,
    })),
    outputPath: state.outputPath,
    outputReleaseType: state.outputReleaseType || null,
    outputVersion: state.outputVersion,
    externalStorageId: state.externalStorageId,
  };
}

export function moveTrack(
  tracks: BuildRecipeTrackState[],
  fromIndex: number,
  toIndex: number,
): BuildRecipeTrackState[] {
  if (fromIndex === toIndex) return tracks;
  const next = [...tracks];
  const [item] = next.splice(fromIndex, 1);
  if (!item) return tracks;
  next.splice(toIndex, 0, item);
  return next;
}

/** Поменять местами дорожку с соседней дорожкой того же типа (вверх/вниз).
 *  Возвращает новый массив; если сосед того же типа нет — возвращает исходный. */
export function moveTrackWithinKind(
  tracks: BuildRecipeTrackState[],
  index: number,
  direction: -1 | 1,
): BuildRecipeTrackState[] {
  const track = tracks[index];
  if (!track) return tracks;
  const target = index + direction;
  const neighbor = tracks[target];
  if (!neighbor || neighbor.kind !== track.kind) return tracks;
  return moveTrack(tracks, index, target);
}

const EXCLUSIVE_DEFAULT_KINDS = ["audio", "subtitle"] as const;

/** At most one default track per audio and subtitle in the build. */
export function normalizeExclusiveDefaults(
  tracks: BuildRecipeTrackState[],
): BuildRecipeTrackState[] {
  let result = tracks;
  for (const kind of EXCLUSIVE_DEFAULT_KINDS) {
    const defaultIndices = result
      .map((t, i) => (t.kind === kind && t.isDefault ? i : -1))
      .filter((i) => i >= 0);
    if (defaultIndices.length <= 1) continue;
    const keep = defaultIndices[0]!;
    result = result.map((t, i) =>
      t.kind === kind && t.isDefault && i !== keep ? { ...t, isDefault: false } : t,
    );
  }
  return result;
}

/** Apply a field patch to one track; default flag is exclusive within the same kind. */
export function applyTrackPatch(
  tracks: BuildRecipeTrackState[],
  index: number,
  patch: Partial<BuildRecipeTrackState>,
): BuildRecipeTrackState[] {
  const target = tracks[index];
  if (!target) return tracks;

  let next = tracks.map((t, i) => (i === index ? { ...t, ...patch } : t));

  if (
    patch.isDefault === true &&
    (target.kind === "audio" || target.kind === "subtitle")
  ) {
    next = next.map((t, i) => {
      if (i === index) return t;
      if (t.kind === target.kind) return { ...t, isDefault: false };
      return t;
    });
  }

  return next;
}
