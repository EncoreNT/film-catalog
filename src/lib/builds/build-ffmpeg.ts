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
  if (key === "out_time_ms" || key === "out_time_us") {
    const raw = Number(value);
    if (!Number.isFinite(raw)) return null;
    // FFmpeg reports out_time_ms in microseconds despite the suffix.
    return { outTimeMs: raw / 1000 };
  }
  if (key === "speed") return { speed: value };
  return null;
}

/** Parses ffmpeg progress speed values like `1.05x` or `0.98`. */
export function parseFfmpegSpeed(speed: string | null | undefined): number | null {
  if (!speed) return null;
  const normalized = speed.trim().toLowerCase().replace(/x$/, "");
  if (normalized === "n/a" || normalized === "") return null;
  const value = Number.parseFloat(normalized);
  if (!Number.isFinite(value) || value <= 0) return null;
  return value;
}
