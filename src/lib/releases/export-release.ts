import { access, stat } from "node:fs/promises";
import { constants } from "node:fs";
import path from "node:path";
import type { ReleaseWithTracks } from "@/lib/movies/movie-include";
import { assertDirectoryWritable, resolveSavedExportTargetDir } from "@/lib/db/settings";
import { isTvReadyRelease } from "@/lib/media/tv-ready";
import {
  displayFilePath,
  joinRuntimePath,
  resolveRuntimePath,
  sanitizeFilename,
} from "@/lib/shared/display-path";

export interface ExportMovieInfo {
  title: string;
  year: number | null;
}

export interface ExportDryRunResult {
  ok: true;
  targetPath: string;
  targetPathDisplay: string;
  collision: boolean;
  suggestedFilename: string;
  savedTargetDir: string | null;
  savedTargetDirDisplay: string | null;
}

function basenameFromRelease(release: ReleaseWithTracks): string | null {
  if (!release.filePath) return null;
  return path.posix.basename(release.filePath.replace(/\\/g, "/"));
}

export function suggestExportFilename(
  release: ReleaseWithTracks,
  movie: ExportMovieInfo,
): string {
  const fromPath = basenameFromRelease(release);
  if (fromPath) {
    return sanitizeFilename(fromPath);
  }
  const yearPart = movie.year ? ` (${movie.year})` : "";
  return sanitizeFilename(`${movie.title}${yearPart}.mkv`);
}

async function fileExists(filePath: string): Promise<boolean> {
  try {
    await access(filePath, constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

function normalizeExportFilename(filename: string): string {
  const trimmed = filename.trim();
  if (!trimmed) return "release.mkv";
  return sanitizeFilename(
    trimmed.toLowerCase().endsWith(".mkv") ? trimmed : `${trimmed}.mkv`,
  );
}

export async function resolveExportCollisionAsync(
  dir: string,
  filename: string,
): Promise<{ exists: boolean; suggestedFilename: string }> {
  const normalized = normalizeExportFilename(filename);
  const targetPath = joinRuntimePath(dir, normalized);
  if (!(await fileExists(targetPath))) {
    return { exists: false, suggestedFilename: normalized };
  }

  const parsed = path.posix.parse(normalized.replace(/\\/g, "/"));
  const stem = parsed.name.replace(/-\d+$/, "");
  let index = 2;
  while (index < 1000) {
    const candidate = sanitizeFilename(`${stem}-${index}${parsed.ext || ".mkv"}`);
    const candidatePath = joinRuntimePath(dir, candidate);
    if (!(await fileExists(candidatePath))) {
      return { exists: true, suggestedFilename: candidate };
    }
    index += 1;
  }

  return { exists: true, suggestedFilename: normalized };
}

function requireExportableRelease(release: ReleaseWithTracks): void {
  if (!isTvReadyRelease(release)) {
    throw new Error("Релиз не подходит для воспроизведения на TV");
  }
  if (!release.filePath) {
    throw new Error("У релиза не указан путь к файлу");
  }
}

async function resolveTargetDir(targetDir: string): Promise<string> {
  const runtimeDir = resolveRuntimePath(targetDir);
  await assertDirectoryWritable(runtimeDir);
  return runtimeDir;
}

export async function exportReleaseDryRun(
  release: ReleaseWithTracks,
  movie: ExportMovieInfo,
  targetDir?: string,
  filename?: string,
): Promise<ExportDryRunResult> {
  requireExportableRelease(release);
  const chosenFilename = normalizeExportFilename(
    filename?.trim() || suggestExportFilename(release, movie),
  );

  const saved = await resolveSavedExportTargetDir();
  const savedTargetDir = saved?.runtime ?? null;
  const savedTargetDirDisplay = saved?.display ?? null;
  const effectiveTargetDir = targetDir?.trim() || savedTargetDir || "";

  if (!effectiveTargetDir) {
    return {
      ok: true,
      targetPath: "",
      targetPathDisplay: "",
      collision: false,
      suggestedFilename: chosenFilename,
      savedTargetDir,
      savedTargetDirDisplay,
    };
  }

  const runtimeDir = await resolveTargetDir(effectiveTargetDir);
  const collision = await resolveExportCollisionAsync(
    runtimeDir,
    chosenFilename,
  );
  const finalFilename = collision.exists
    ? collision.suggestedFilename
    : chosenFilename;
  const targetPath = joinRuntimePath(runtimeDir, finalFilename);

  return {
    ok: true,
    targetPath,
    targetPathDisplay: displayFilePath(targetPath),
    collision: collision.exists,
    suggestedFilename: finalFilename,
    savedTargetDir,
    savedTargetDirDisplay,
  };
}

export async function assertExportSourceReadable(release: ReleaseWithTracks) {
  requireExportableRelease(release);
  const sourceStat = await stat(release.filePath!);
  return sourceStat.size;
}
