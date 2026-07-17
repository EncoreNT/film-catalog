import { execa } from "execa";

export interface CliToolStatus {
  available: boolean;
  version: string | null;
}

export interface BuildCapabilities {
  ffmpeg: CliToolStatus;
  ffprobe: CliToolStatus;
  mkvmerge: CliToolStatus;
}

async function probeTool(command: string, args: string[]): Promise<CliToolStatus> {
  try {
    const { stdout } = await execa(command, args, { timeout: 10_000 });
    const firstLine = stdout.split("\n")[0]?.trim() ?? null;
    return { available: true, version: firstLine };
  } catch {
    return { available: false, version: null };
  }
}

export async function getBuildCapabilities(): Promise<BuildCapabilities> {
  const [ffmpeg, ffprobe, mkvmerge] = await Promise.all([
    probeTool("ffmpeg", ["-version"]),
    probeTool("ffprobe", ["-version"]),
    probeTool("mkvmerge", ["--version"]),
  ]);
  return { ffmpeg, ffprobe, mkvmerge };
}

export function assertBuildCapabilities(cap: BuildCapabilities): string | null {
  if (!cap.ffmpeg.available) return "ffmpeg не найден в PATH";
  if (!cap.ffprobe.available) return "ffprobe не найден в PATH";
  if (!cap.mkvmerge.available) return "mkvmerge не найден в PATH";
  return null;
}
