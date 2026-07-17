import path from "path";

export interface MkvMergeInputFile {
  filePath: string;
  videoTrackIds?: number[];
  audioTrackIds?: number[];
  subtitleTrackIds?: number[];
  noChapters?: boolean;
  noAttachments?: boolean;
  /** mkvmerge `--default-track-flag` entries for this input (e.g. `2`, `2:0`). */
  defaultTrackFlags?: string[];
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
