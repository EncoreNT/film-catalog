import {
  buildMkvmergeOutputPlan,
  type MkvMergePlan,
  type MkvResolvedTrack,
} from "@/lib/builds/build-mkvmerge";

export interface BdmvMuxTrack {
  sortOrder: number;
  kind: "video" | "audio" | "subtitle";
  mkvTrackId: number;
  isDefault: boolean;
  forced?: boolean;
  name?: string;
}

export function bdmvTracksToMkvmergePlan(
  outputPath: string,
  playlistPath: string,
  tracks: BdmvMuxTrack[],
): MkvMergePlan {
  const videoTrackIds = tracks
    .filter((t) => t.kind === "video")
    .map((t) => t.mkvTrackId);
  const audioTrackIds = tracks
    .filter((t) => t.kind === "audio")
    .map((t) => t.mkvTrackId);
  const subtitleTrackIds = tracks
    .filter((t) => t.kind === "subtitle")
    .map((t) => t.mkvTrackId);

  const resolved: MkvResolvedTrack[] = tracks.map((track) => ({
    sortOrder: track.sortOrder,
    kind: track.kind,
    syncFileIndex: 0,
    mkvTrackId: track.mkvTrackId,
    isDefault: track.isDefault,
  }));
  const muxPlan = buildMkvmergeOutputPlan(resolved);
  const names = tracks
    .map((track) => ({
      trackId: track.mkvTrackId,
      name: track.name?.trim() ?? "",
    }))
    .filter((named) => named.name.length > 0);

  return {
    outputPath,
    inputs: [
      {
        filePath: playlistPath,
        videoTrackIds,
        audioTrackIds,
        subtitleTrackIds,
        noChapters: false,
        defaultTrackFlags: muxPlan.defaultFlagsByFileIndex.get(0) ?? [],
        forcedDisplayFlags: tracks.map((track) =>
          track.forced ? String(track.mkvTrackId) : `${track.mkvTrackId}:0`,
        ),
        trackNames: names,
        noTrackTags: names.length > 0,
      },
    ],
    trackOrder: muxPlan.trackOrder,
  };
}
