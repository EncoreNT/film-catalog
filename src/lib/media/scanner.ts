import { readdir, stat } from "fs/promises";
import path from "path";
import { prisma } from "@/lib/db/prisma";
import { probeMediaFile } from "@/lib/media/ffprobe";
import { maybeExtractCover } from "@/lib/covers/cover-storage";
import { parseMovieName } from "@/lib/media/name-parser";
import { computeFileHashPrefix } from "@/lib/media/file-hash";
import { syncReleaseTracksFromProbe } from "@/lib/releases/release-tracks";
import { resolveMovieSlug } from "@/lib/movies/movie-slug";
import { computeMatchKey } from "@/lib/movies/movie-match-key";
import { MovieStatus } from "@/generated/prisma/client";

const VIDEO_EXTENSIONS = new Set([
  ".mkv",
  ".mp4",
  ".avi",
  ".mov",
  ".webm",
  ".m4v",
  ".ts",
  ".wmv",
  ".flv",
  ".mpg",
  ".mpeg",
  ".m2ts",
]);

export interface ScanSummary {
  found: number;
  newDrafts: number;
  updated: number;
  moved: number;
  skipped: number;
  errors: string[];
  cancelled: boolean;
}

export type ScanProgressEvent =
  | { type: "start"; total: number }
  | {
      type: "file";
      index: number;
      total: number;
      fileName: string;
      filePath: string;
    }
  | { type: "summary"; summary: ScanSummary };

export type ScanStreamEvent =
  | ScanProgressEvent
  | { type: "error"; message: string };

export interface ScanOptions {
  signal?: AbortSignal;
  onProgress?: (event: ScanProgressEvent) => void;
  externalStorageId?: number | null;
}

async function walkVideoFiles(dir: string): Promise<string[]> {
  const results: string[] = [];
  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch {
    return results;
  }

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name.startsWith(".")) continue;
      results.push(...(await walkVideoFiles(fullPath)));
    } else if (entry.isFile()) {
      const ext = path.extname(entry.name).toLowerCase();
      if (VIDEO_EXTENSIONS.has(ext)) {
        results.push(fullPath);
      }
    }
  }
  return results;
}

export async function scanDirectory(
  rootPath: string,
  options: ScanOptions = {},
): Promise<ScanSummary> {
  const { signal, onProgress, externalStorageId } = options;
  const summary: ScanSummary = {
    found: 0,
    newDrafts: 0,
    updated: 0,
    moved: 0,
    skipped: 0,
    errors: [],
    cancelled: false,
  };

  const files = await walkVideoFiles(rootPath);
  summary.found = files.length;
  onProgress?.({ type: "start", total: files.length });

  for (let i = 0; i < files.length; i++) {
    if (signal?.aborted) {
      summary.cancelled = true;
      break;
    }
    const filePath = files[i];
    const fileName = path.basename(filePath);
    onProgress?.({
      type: "file",
      index: i + 1,
      total: files.length,
      fileName,
      filePath,
    });

    try {
      const fileStat = await stat(filePath);
      const fileSize = fileStat.size;
      const fileMtime = fileStat.mtime;

      const existing = await prisma.release.findFirst({
        where: { filePath },
        include: { movie: true },
      });

      if (
        existing &&
        existing.fileSize === fileSize &&
        existing.fileMtime?.getTime() === fileMtime.getTime()
      ) {
        if (externalStorageId != null) {
          await prisma.release.update({
            where: { id: existing.id },
            data: { externalStorageId },
          });
        }
        summary.skipped++;
        continue;
      }

      let fileHash = existing?.fileHash ?? null;
      const needsHash =
        !existing ||
        existing.fileSize !== fileSize ||
        existing.fileMtime?.getTime() !== fileMtime.getTime();

      if (needsHash) {
        if (signal?.aborted) {
          summary.cancelled = true;
          break;
        }
        fileHash = await computeFileHashPrefix(filePath);
      }

      const movedRelease =
        fileHash &&
        (await prisma.release.findFirst({
          where: {
            fileHash,
            fileSize,
            NOT: { filePath },
          },
          include: { movie: true },
        }));

      const parentFolder = path.basename(path.dirname(filePath));
      const parsed = parseMovieName(fileName, parentFolder);

      let probe;
      try {
        probe = await probeMediaFile(filePath, signal);
      } catch (err) {
        if (signal?.aborted) {
          summary.cancelled = true;
          break;
        }
        summary.errors.push(
          `${fileName}: ffprobe failed — ${err instanceof Error ? err.message : "unknown"}`,
        );
        probe = {
          durationSeconds: null,
          video: null,
          audio: [],
          subtitles: [],
        };
      }

      if (existing) {
        await prisma.release.update({
          where: { id: existing.id },
          data: {
            fileSize,
            fileMtime,
            fileHash,
            durationSeconds: probe.durationSeconds,
            ...(externalStorageId != null ? { externalStorageId } : {}),
          },
        });
        await syncReleaseTracksFromProbe(prisma, existing.id, probe);
        await maybeExtractCover(
          existing.movieId,
          filePath,
          !!existing.movie.coverPath,
          signal,
        );
        summary.updated++;
        continue;
      }

      if (movedRelease) {
        await prisma.release.update({
          where: { id: movedRelease.id },
          data: {
            filePath,
            fileSize,
            fileMtime,
            fileHash,
            durationSeconds: probe.durationSeconds,
            ...(externalStorageId != null ? { externalStorageId } : {}),
          },
        });
        await syncReleaseTracksFromProbe(prisma, movedRelease.id, probe);
        await maybeExtractCover(
          movedRelease.movieId,
          filePath,
          !!movedRelease.movie.coverPath,
          signal,
        );
        summary.moved++;
        continue;
      }

      if (signal?.aborted) {
        summary.cancelled = true;
        break;
      }

      const slug = await resolveMovieSlug(prisma, parsed.title);
      const matchKey = computeMatchKey(parsed.title, parsed.year);

      const movie = await prisma.movie.create({
        data: {
          slug,
          title: parsed.title,
          year: parsed.year,
          matchKey,
          status: MovieStatus.DRAFT,
          releases: {
            create: {
              releaseType: parsed.releaseType,
              durationSeconds: probe.durationSeconds,
              filePath,
              fileSize,
              fileMtime,
              fileHash,
              ...(externalStorageId != null ? { externalStorageId } : {}),
            },
          },
        },
        include: { releases: true },
      });

      const release = movie.releases[0];
      await syncReleaseTracksFromProbe(prisma, release.id, probe);
      await maybeExtractCover(movie.id, filePath, false, signal);
      summary.newDrafts++;
    } catch (err) {
      if (signal?.aborted) {
        summary.cancelled = true;
        break;
      }
      summary.errors.push(
        `${filePath}: ${err instanceof Error ? err.message : "unknown error"}`,
      );
    }
  }

  onProgress?.({ type: "summary", summary });
  return summary;
}
