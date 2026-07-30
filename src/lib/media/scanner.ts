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
import {
  ensureMoviePart,
  recomputeMoviePartCount,
} from "@/lib/movies/movie-parts";
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

export interface ScanCreatedEntry {
  movieId: number;
  slug: string;
  title: string;
  year: number | null;
  releaseType: string | null;
  filePath: string;
}

/** What changed in an updated release. Honest, observable diffs only. */
export type ScanChangeFlag =
  | "size" // file size differs
  | "content" // file hash differs (content actually changed)
  | "duration" // duration differs
  | "cover" // a cover was newly extracted
  | "storage" // external storage assignment changed
  | "touched" // only mtime changed (file touched, content identical)
  | "added"; // a new release/episode was added to an existing movie

export interface ScanUpdatedEntry {
  movieId: number;
  slug: string;
  title: string;
  year: number | null;
  releaseType: string | null;
  filePath: string;
  changes: ScanChangeFlag[];
}

export interface ScanMovedEntry {
  movieId: number;
  slug: string;
  title: string;
  year: number | null;
  releaseType: string | null;
  fromPath: string;
  toPath: string;
}

export type ScanErrorStage = "ffprobe" | "io" | "unknown";

export interface ScanErrorEntry {
  fileName: string;
  filePath: string;
  message: string;
  stage: ScanErrorStage;
}

export interface ScanSummary {
  found: number;
  newDrafts: number;
  updated: number;
  moved: number;
  skipped: number;
  /** Structured per-file detail. Counters above stay for headline + back-compat. */
  created: ScanCreatedEntry[];
  updatedFiles: ScanUpdatedEntry[];
  movedFiles: ScanMovedEntry[];
  errors: ScanErrorEntry[];
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

async function linkReleaseToSeriesPart(
  releaseId: number,
  movieId: number,
  partNumber: number | null,
  partTotal: number | null,
) {
  if (partNumber == null) return;
  const part = await ensureMoviePart(prisma, movieId, partNumber);
  await prisma.release.update({
    where: { id: releaseId },
    data: { moviePartId: part.id },
  });
  await recomputeMoviePartCount(prisma, movieId, partTotal);
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
    created: [],
    updatedFiles: [],
    movedFiles: [],
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
        summary.errors.push({
          fileName,
          filePath,
          message: err instanceof Error ? err.message : "неизвестная ошибка",
          stage: "ffprobe",
        });
        probe = {
          durationSeconds: null,
          video: null,
          audio: [],
          subtitles: [],
        };
      }

      if (existing) {
        const sizeChanged = existing.fileSize !== fileSize;
        const mtimeChanged =
          existing.fileMtime?.getTime() !== fileMtime.getTime();
        const contentChanged =
          fileHash != null && existing.fileHash !== fileHash;
        const durationChanged =
          existing.durationSeconds !== probe.durationSeconds;
        const storageChanged =
          externalStorageId != null &&
          existing.externalStorageId !== externalStorageId;

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
        await linkReleaseToSeriesPart(
          existing.id,
          existing.movieId,
          parsed.partNumber,
          parsed.partTotal,
        );
        const coverAdded = await maybeExtractCover(
          existing.movieId,
          filePath,
          !!existing.movie.coverPath,
          signal,
        );

        const changes: ScanChangeFlag[] = [];
        if (sizeChanged) changes.push("size");
        if (contentChanged) changes.push("content");
        if (durationChanged) changes.push("duration");
        if (coverAdded) changes.push("cover");
        if (storageChanged) changes.push("storage");
        // File was touched (mtime) but content identical and nothing else moved.
        if (mtimeChanged && !sizeChanged && !contentChanged && changes.length === 0) {
          changes.push("touched");
        }

        summary.updated++;
        summary.updatedFiles.push({
          movieId: existing.movieId,
          slug: existing.movie.slug,
          title: existing.movie.title,
          year: existing.movie.year,
          releaseType: existing.releaseType,
          filePath,
          changes,
        });
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
        await linkReleaseToSeriesPart(
          movedRelease.id,
          movedRelease.movieId,
          parsed.partNumber,
          parsed.partTotal,
        );
        await maybeExtractCover(
          movedRelease.movieId,
          filePath,
          !!movedRelease.movie.coverPath,
          signal,
        );
        summary.moved++;
        summary.movedFiles.push({
          movieId: movedRelease.movieId,
          slug: movedRelease.movie.slug,
          title: movedRelease.movie.title,
          year: movedRelease.movie.year,
          releaseType: movedRelease.releaseType,
          // filePath is @unique but typed nullable; the NOT:{filePath} filter
          // guarantees a non-null previous path at runtime.
          fromPath: movedRelease.filePath ?? "",
          toPath: filePath,
        });
        continue;
      }

      if (signal?.aborted) {
        summary.cancelled = true;
        break;
      }

      const matchKey = computeMatchKey(parsed.title, parsed.year);

      if (parsed.partNumber != null) {
        let movie = await prisma.movie.findFirst({ where: { matchKey } });
        let createdNewMovie = false;
        if (!movie) {
          const slug = await resolveMovieSlug(prisma, parsed.title);
          movie = await prisma.movie.create({
            data: {
              slug,
              title: parsed.title,
              year: parsed.year,
              matchKey,
              status: MovieStatus.DRAFT,
            },
          });
          createdNewMovie = true;
        }

        const part = await ensureMoviePart(
          prisma,
          movie.id,
          parsed.partNumber,
        );
        const release = await prisma.release.create({
          data: {
            movieId: movie.id,
            moviePartId: part.id,
            releaseType: parsed.releaseType,
            durationSeconds: probe.durationSeconds,
            filePath,
            fileSize,
            fileMtime,
            fileHash,
            ...(externalStorageId != null ? { externalStorageId } : {}),
          },
        });
        await syncReleaseTracksFromProbe(prisma, release.id, probe);
        await maybeExtractCover(
          movie.id,
          filePath,
          !!movie.coverPath,
          signal,
        );
        await recomputeMoviePartCount(prisma, movie.id, parsed.partTotal);
        if (createdNewMovie) {
          summary.newDrafts++;
          summary.created.push({
            movieId: movie.id,
            slug: movie.slug,
            title: movie.title,
            year: movie.year,
            releaseType: parsed.releaseType,
            filePath,
          });
        } else {
          summary.updated++;
          summary.updatedFiles.push({
            movieId: movie.id,
            slug: movie.slug,
            title: movie.title,
            year: movie.year,
            releaseType: parsed.releaseType,
            filePath,
            changes: ["added"],
          });
        }
        continue;
      }

      const slug = await resolveMovieSlug(prisma, parsed.title);

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
      summary.created.push({
        movieId: movie.id,
        slug: movie.slug,
        title: movie.title,
        year: movie.year,
        releaseType: parsed.releaseType,
        filePath,
      });
    } catch (err) {
      if (signal?.aborted) {
        summary.cancelled = true;
        break;
      }
      summary.errors.push({
        fileName,
        filePath,
        message: err instanceof Error ? err.message : "неизвестная ошибка",
        stage: "io",
      });
    }
  }

  onProgress?.({ type: "summary", summary });
  return summary;
}
