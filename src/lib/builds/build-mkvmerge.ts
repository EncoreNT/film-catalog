import path from "path";

export interface MkvMergeTrackSync {
  /** Matroska track ID within this input file. */
  trackId: number;
  /** Delay in milliseconds (mkvmerge `--sync TID:delay`). */
  offsetMs: number;
}

export interface MkvMergeTrackName {
  trackId: number;
  name: string;
}

/** mkvmerge `--track-name` argument (`TID:name`; name may contain colons). */
export function formatMkvmergeTrackNameArg(trackId: number, name: string): string {
  return `${trackId}:${name}`;
}

export interface MkvMergeInputFile {
  filePath: string;
  videoTrackIds?: number[];
  audioTrackIds?: number[];
  subtitleTrackIds?: number[];
  noChapters?: boolean;
  noAttachments?: boolean;
  /** mkvmerge `--default-track-flag` entries for this input (e.g. `2`, `2:0`). */
  defaultTrackFlags?: string[];
  /** Per-track timestamp adjustments for stream-copy audio/subtitle from this input. */
  trackSync?: MkvMergeTrackSync[];
  /** Matroska track titles embedded in the output file (`--track-name`). */
  trackNames?: MkvMergeTrackName[];
  /** Omit copied Matroska track tags so `--track-name` is not overridden. */
  noTrackTags?: boolean;
}

export interface MkvMergePlan {
  outputPath: string;
  inputs: MkvMergeInputFile[];
  trackOrder?: string[];
}

export interface MkvResolvedTrack {
  sortOrder: number;
  kind: "video" | "audio" | "subtitle";
  syncFileIndex: number;
  mkvTrackId: number;
  isDefault: boolean;
}

export function buildMkvmergeOutputPlan(tracks: MkvResolvedTrack[]): {
  trackOrder: string[];
  defaultFlagsByFileIndex: Map<number, string[]>;
} {
  const sorted = [...tracks].sort((a, b) => a.sortOrder - b.sortOrder);
  const trackOrder = sorted.map((t) => `${t.syncFileIndex}:${t.mkvTrackId}`);
  const defaultFlagsByFileIndex = new Map<number, string[]>();

  for (const track of sorted) {
    if (track.kind !== "audio" && track.kind !== "subtitle") continue;
    const flags = defaultFlagsByFileIndex.get(track.syncFileIndex) ?? [];
    flags.push(track.isDefault ? String(track.mkvTrackId) : `${track.mkvTrackId}:0`);
    defaultFlagsByFileIndex.set(track.syncFileIndex, flags);
  }

  return { trackOrder, defaultFlagsByFileIndex };
}

export function buildMkvmergeArgs(plan: MkvMergePlan): string[] {
  const args = ["-o", plan.outputPath, "--no-date", "--gui-mode"];

  for (const input of plan.inputs) {
    for (const flag of input.defaultTrackFlags ?? []) {
      args.push("--default-track-flag", flag);
    }

    if (input.noTrackTags) {
      args.push("--no-track-tags");
    }

    args.push("--no-global-tags");
    if (input.noChapters) args.push("--no-chapters");
    if (input.noAttachments) args.push("--no-attachments");

    if (input.videoTrackIds?.length) {
      args.push("--video-tracks", input.videoTrackIds.join(","));
    } else {
      args.push("--no-video");
    }

    if (input.audioTrackIds?.length) {
      args.push("--audio-tracks", input.audioTrackIds.join(","));
    } else {
      args.push("--no-audio");
    }

    if (input.subtitleTrackIds?.length) {
      args.push("--subtitle-tracks", input.subtitleTrackIds.join(","));
    } else {
      args.push("--no-subtitles");
    }

    for (const sync of input.trackSync ?? []) {
      if (sync.offsetMs === 0) continue;
      args.push("--sync", `${sync.trackId}:${sync.offsetMs}`);
    }

    for (const named of input.trackNames ?? []) {
      const trimmed = named.name.trim();
      if (!trimmed) continue;
      args.push("--track-name", formatMkvmergeTrackNameArg(named.trackId, trimmed));
    }

    args.push(input.filePath);
  }

  if (plan.trackOrder?.length) {
    args.push("--track-order", plan.trackOrder.join(","));
  }

  return args;
}

export function parseMkvmergeProgress(line: string): number | null {
  const match = line.match(/progress\s+(\d+)%/i);
  if (!match) return null;
  const pct = Number(match[1]);
  return Number.isFinite(pct) ? pct : null;
}

export function tempTranscodedAudioPath(
  jobId: number,
  sortOrder: number,
  outputDir: string,
): string {
  return path.join(outputDir, `.build-${jobId}-audio-${sortOrder}.mka`);
}
