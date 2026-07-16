import type { ReleaseWithTracks } from "@/lib/movies/movie-include";
import type { ChannelTarget, TranscodeCodec } from "@/lib/builds/build-presets";

export type BuildTrackKind = "video" | "audio" | "subtitle";
export type BuildAudioMode = "copy" | "transcode";

export interface BuildRecipeTrackState {
  key: string;
  kind: BuildTrackKind;
  sourceReleaseId: number;
  sourceStreamIndex: number;
  label: string;
  audioMode?: BuildAudioMode;
  transcodeCodec?: TranscodeCodec;
  transcodeBitrate?: number;
  channelTarget?: ChannelTarget;
  offsetMs?: number;
  isDefault?: boolean;
  forced?: boolean;
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
): BuildRecipeFormState {
  const primary = releases[0];
  const tracks: BuildRecipeTrackState[] = [];

  if (primary?.videoTrack) {
    tracks.push({
      key: crypto.randomUUID(),
      kind: "video",
      sourceReleaseId: primary.id,
      sourceStreamIndex: primary.videoTrack.streamIndex,
      label: "Видео",
    });
  }

  for (const audio of primary?.audioTracks ?? []) {
    tracks.push({
      key: crypto.randomUUID(),
      kind: "audio",
      sourceReleaseId: primary.id,
      sourceStreamIndex: audio.streamIndex,
      label: audio.title || audio.language || `Audio ${audio.streamIndex}`,
      audioMode: "copy",
      offsetMs: 0,
      isDefault: audio.isDefault,
    });
  }

  for (const sub of primary?.subtitleTracks ?? []) {
    tracks.push({
      key: crypto.randomUUID(),
      kind: "subtitle",
      sourceReleaseId: primary.id,
      sourceStreamIndex: sub.streamIndex,
      label: sub.title || sub.language || `Sub ${sub.streamIndex}`,
      forced: sub.forced,
      isDefault: sub.isDefault,
    });
  }

  return {
    tracks,
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
      offsetMs: track.kind === "audio" ? track.offsetMs ?? 0 : undefined,
      isDefault: track.isDefault,
      forced: track.forced,
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
