import { access, copyFile, stat } from "node:fs/promises";
import { constants } from "node:fs";
import path from "node:path";
import type { ReleaseWithTracks } from "@/lib/movies/movie-include";
import { getMediaSaveDir } from "@/lib/db/settings";
import { isTvReadyRelease } from "@/lib/media/tv-ready";
import {
  displayFilePath,
  joinRuntimePath,
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
}

export interface ExportResult {
  ok: true;
  targetPath: string;
  targetPathDisplay: string;
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

async function requireExportContext(
  release: ReleaseWithTracks,
): Promise<{ mediaSaveDir: string }> {
  if (!isTvReadyRelease(release)) {
    throw new Error("Релиз не подходит для воспроизведения на TV");
  }
  if (!release.filePath) {
    throw new Error("У релиза не указан путь к файлу");
  }

  const mediaSaveDir = await getMediaSaveDir();
  if (!mediaSaveDir) {
    throw new Error("Папка сохранения не настроена");
  }

  return { mediaSaveDir };
}

export async function exportReleaseDryRun(
  release: ReleaseWithTracks,
  movie: ExportMovieInfo,
  filename?: string,
): Promise<ExportDryRunResult> {
  const { mediaSaveDir } = await requireExportContext(release);
  const chosenFilename = normalizeExportFilename(
    filename?.trim() || suggestExportFilename(release, movie),
  );
  const collision = await resolveExportCollisionAsync(
    mediaSaveDir,
    chosenFilename,
  );
  const finalFilename = collision.exists
    ? collision.suggestedFilename
    : chosenFilename;
  const targetPath = joinRuntimePath(mediaSaveDir, finalFilename);

  return {
    ok: true,
    targetPath,
    targetPathDisplay: displayFilePath(targetPath),
    collision: collision.exists,
    suggestedFilename: finalFilename,
  };
}

export async function exportReleaseToMediaDir(
  release: ReleaseWithTracks,
  movie: ExportMovieInfo,
  filename: string,
): Promise<ExportResult> {
  const { mediaSaveDir } = await requireExportContext(release);
  const targetFilename = normalizeExportFilename(filename);
  const targetPath = joinRuntimePath(mediaSaveDir, targetFilename);

  if (await fileExists(targetPath)) {
    throw new Error(`Файл уже существует: ${displayFilePath(targetPath)}`);
  }

  await copyFile(release.filePath!, targetPath);
  const [copied, source] = await Promise.all([
    stat(targetPath),
    stat(release.filePath!),
  ]);
  if (copied.size !== source.size) {
    throw new Error("Размер скопированного файла не совпадает с исходником");
  }

  return {
    ok: true,
    targetPath,
    targetPathDisplay: displayFilePath(targetPath),
  };
}
