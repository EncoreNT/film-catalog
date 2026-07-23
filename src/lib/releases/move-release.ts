import { access, stat } from "node:fs/promises";
import { constants } from "node:fs";
import type { ReleaseWithTracks } from "@/lib/movies/movie-include";
import { assertDirectoryWritable } from "@/lib/db/settings";
import {
  displayFilePath,
  joinRuntimePath,
  resolveRuntimePath,
} from "@/lib/shared/display-path";
import { assertTargetDirFits } from "@/lib/shared/disk-space-fit";
import {
  resolveExportCollisionAsync,
  suggestExportFilename,
  type ExportMovieInfo,
} from "@/lib/releases/export-release";

export interface MoveDryRunResult {
  ok: true;
  targetPath: string;
  targetPathDisplay: string;
  collision: boolean;
  suggestedFilename: string;
  sameAsSource: boolean;
}

function normalizeMoveFilename(filename: string): string {
  const trimmed = filename.trim();
  if (!trimmed) return "release.mkv";
  return trimmed.toLowerCase().endsWith(".mkv") ? trimmed : `${trimmed}.mkv`;
}

async function fileExists(filePath: string): Promise<boolean> {
  try {
    await access(filePath, constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

function requireMovableRelease(release: ReleaseWithTracks): void {
  if (!release.filePath?.trim()) {
    throw new Error("У релиза не указан путь к файлу");
  }
}

async function resolveTargetDir(targetDir: string): Promise<string> {
  const runtimeDir = resolveRuntimePath(targetDir);
  await assertDirectoryWritable(runtimeDir);
  return runtimeDir;
}

export async function moveReleaseDryRun(
  release: ReleaseWithTracks,
  movie: ExportMovieInfo,
  targetDir: string,
  filename?: string,
): Promise<MoveDryRunResult> {
  requireMovableRelease(release);
  const sourcePath = release.filePath!.trim();
  const chosenFilename = normalizeMoveFilename(
    filename?.trim() || suggestExportFilename(release, movie),
  );

  if (!targetDir.trim()) {
    return {
      ok: true,
      targetPath: "",
      targetPathDisplay: "",
      collision: false,
      suggestedFilename: chosenFilename,
      sameAsSource: false,
    };
  }

  const runtimeDir = await resolveTargetDir(targetDir);
  const collision = await resolveExportCollisionAsync(runtimeDir, chosenFilename);
  const finalFilename = collision.exists
    ? collision.suggestedFilename
    : chosenFilename;
  const targetPath = joinRuntimePath(runtimeDir, finalFilename);
  const sameAsSource = resolveRuntimePath(targetPath) === resolveRuntimePath(sourcePath);

  return {
    ok: true,
    targetPath,
    targetPathDisplay: displayFilePath(targetPath),
    collision: collision.exists,
    suggestedFilename: finalFilename,
    sameAsSource,
  };
}

export async function assertMoveSourceReadable(release: ReleaseWithTracks) {
  requireMovableRelease(release);
  const sourceStat = await stat(release.filePath!);
  return sourceStat.size;
}

export async function assertMoveTargetAvailable(
  targetPath: string,
  sourcePath: string,
): Promise<void> {
  if (resolveRuntimePath(targetPath) === resolveRuntimePath(sourcePath)) {
    throw new Error("Путь назначения совпадает с текущим расположением файла");
  }
  if (await fileExists(targetPath)) {
    throw new Error(`Файл уже существует: ${displayFilePath(targetPath)}`);
  }
}

export async function assertMoveTargetFits(
  targetDir: string,
  requiredBytes: number | null | undefined,
): Promise<void> {
  return assertTargetDirFits(targetDir, requiredBytes);
}
