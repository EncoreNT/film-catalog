import { readdir, stat } from "fs/promises";
import path from "path";
import { prisma } from "./prisma";
import { probeMediaFile } from "./ffprobe";
import { maybeExtractCover } from "./cover-storage";
import { parseMovieName } from "./name-parser";
import { computeFileHashPrefix } from "./file-hash";
import { syncMovieTracksFromProbe } from "./movie-tracks";
import { resolveMovieSlug } from "./movie-slug";
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
  /** True when the scan was cancelled mid-way via the AbortSignal. */
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

export interface ScanOptions {
  /** Cooperative cancellation — checked between files and passed to ffprobe. */
  signal?: AbortSignal;
  /** Progress callback (used by the streaming scan endpoint). */
  onProgress?: (event: ScanProgressEvent) => void;
  /** When set, all found movies are tagged with this storage. */
  storageId?: number | null;
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
  const { signal, onProgress, storageId } = options;
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

      const existing = await prisma.movie.findFirst({
        where: { filePath },
      });

      if (
        existing &&
        existing.fileSize === fileSize &&
        existing.fileMtime?.getTime() === fileMtime.getTime()
      ) {
        if (storageId != null) {
          await prisma.movie.update({
            where: { id: existing.id },
            data: { storageId },
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

      // Detect a move: same content hash at a different path. Requiring a
      // matching fileSize too guards against the (very unlikely) case of two
      // different films sharing the same first-16MB hash prefix — that would
      // otherwise overwrite one film's entry instead of creating a new one.
      const movedMovie =
        fileHash &&
        (await prisma.movie.findFirst({
          where: {
            fileHash,
            fileSize,
            NOT: { filePath },
          },
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

      // Prefer the entry already bound to this path: the file at this path
      // changed (re-rip, re-mux) and should update in place. Only when nothing
      // is registered at this path do we look for a same-content entry
      // elsewhere and treat it as a move. Checking `existing` first avoids a
      // duplicate-by-path when a file is overwritten with content identical to
      // another catalogued file.
      if (existing) {
        await prisma.movie.update({
          where: { id: existing.id },
          data: {
            fileSize,
            fileMtime,
            fileHash,
            durationSeconds: probe.durationSeconds,
            ...(storageId != null ? { storageId } : {}),
          },
        });
        await syncMovieTracksFromProbe(prisma, existing.id, probe);
        await maybeExtractCover(
          existing.id,
          filePath,
          !!existing.coverPath,
          signal,
        );
        summary.updated++;
        continue;
      }

      if (movedMovie) {
        await prisma.movie.update({
          where: { id: movedMovie.id },
          data: {
            filePath,
            fileSize,
            fileMtime,
            fileHash,
            durationSeconds: probe.durationSeconds,
            ...(storageId != null ? { storageId } : {}),
          },
        });
        await syncMovieTracksFromProbe(prisma, movedMovie.id, probe);
        await maybeExtractCover(
          movedMovie.id,
          filePath,
          !!movedMovie.coverPath,
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

      const movie = await prisma.movie.create({
        data: {
          slug,
          title: parsed.title,
          year: parsed.year,
          releaseType: parsed.releaseType,
          durationSeconds: probe.durationSeconds,
          filePath,
          fileSize,
          fileMtime,
          fileHash,
          status: MovieStatus.DRAFT,
          ...(storageId != null ? { storageId } : {}),
        },
      });
      await syncMovieTracksFromProbe(prisma, movie.id, probe);
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
