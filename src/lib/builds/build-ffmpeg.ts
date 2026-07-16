import type { ChannelTarget, TranscodeCodec } from "@/lib/builds/build-presets";
import { channelTargetToLayout } from "@/lib/builds/build-presets";

export interface FfmpegTranscodeInput {
  inputPath: string;
  streamIndex: number;
  outputPath: string;
  codec: TranscodeCodec;
  bitrateKbps: number;
  channelTarget: ChannelTarget;
  offsetMs: number;
}

export function buildFfmpegTranscodeArgs(input: FfmpegTranscodeInput): string[] {
  const layout = channelTargetToLayout(input.channelTarget);
  const args = [
    "-hide_banner",
    "-y",
    "-i",
    input.inputPath,
    "-map",
    `0:a:${streamOrdinalPlaceholder(input.streamIndex)}`,
    "-vn",
    "-sn",
    "-c:a",
    input.codec,
    "-b:a",
    `${input.bitrateKbps}k`,
  ];

  if (input.channelTarget === "stereo") {
    args.push("-ac", "2");
  } else {
    args.push("-ac", "6", "-channel_layout", layout);
  }

  if (input.offsetMs !== 0) {
    args.unshift("-itsoffset", String(input.offsetMs / 1000));
  }

  args.push(
    "-progress",
    "pipe:1",
    "-nostats",
    outputPathArg(input.outputPath),
  );
  return args;
}

function outputPathArg(path: string): string {
  return path;
}

/** Map ffprobe global stream index to ffmpeg audio stream selector ordinal */
export function streamOrdinalPlaceholder(_ffprobeIndex: number): string {
  // Caller should pass ordinal among audio streams, not ffprobe global index
  return String(_ffprobeIndex);
}

export function buildFfmpegAudioOrdinalArgs(
  input: FfmpegTranscodeInput,
  audioOrdinal: number,
): string[] {
  const args: string[] = ["-hide_banner", "-y"];

  if (input.offsetMs !== 0) {
    args.push("-itsoffset", String(input.offsetMs / 1000));
  }

  args.push(
    "-i",
    input.inputPath,
    "-map",
    `0:a:${audioOrdinal}`,
    "-vn",
    "-sn",
    "-c:a",
    input.codec,
    "-b:a",
    `${input.bitrateKbps}k`,
  );

  if (input.channelTarget === "stereo") {
    args.push("-ac", "2");
  } else {
    args.push("-ac", "6");
  }

  args.push("-progress", "pipe:1", "-nostats", input.outputPath);
  return args;
}

export function parseFfmpegProgressLine(line: string): {
  outTimeMs?: number;
  speed?: string;
} | null {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith("#")) return null;
  const eq = trimmed.indexOf("=");
  if (eq < 0) return null;
  const key = trimmed.slice(0, eq);
  const value = trimmed.slice(eq + 1);
  if (key === "out_time_ms") {
    const outTimeMs = Number(value);
    return Number.isFinite(outTimeMs) ? { outTimeMs } : null;
  }
  if (key === "speed") return { speed: value };
  return null;
}
