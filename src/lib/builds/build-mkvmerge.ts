import path from "path";

export interface MkvMergeInputFile {
  filePath: string;
  videoTrackIds?: number[];
  audioTrackIds?: number[];
  subtitleTrackIds?: number[];
  noChapters?: boolean;
  noAttachments?: boolean;
}

export interface MkvMergePlan {
  outputPath: string;
  inputs: MkvMergeInputFile[];
  defaultAudioOrdinal?: number;
  trackOrder?: string[];
}

export function buildMkvmergeArgs(plan: MkvMergePlan): string[] {
  const args = ["-o", plan.outputPath, "--no-date", "--gui-mode"];

  for (const input of plan.inputs) {
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

  if (plan.defaultAudioOrdinal != null) {
    args.push("--default-track-flag", `0:${plan.defaultAudioOrdinal}`);
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
