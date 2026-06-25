import { readdir, stat } from "fs/promises";
import path from "path";
import { prisma } from "./prisma";
import { probeMediaFile } from "./ffprobe";
import { parseMovieName } from "./name-parser";
import { computeFileHashPrefix } from "./file-hash";
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

async function upsertTracks(
  movieId: number,
  probe: Awaited<ReturnType<typeof probeMediaFile>>,
) {
  await prisma.audioTrack.deleteMany({ where: { movieId } });
  await prisma.subtitleTrack.deleteMany({ where: { movieId } });

  if (probe.video) {
    await prisma.videoTrack.upsert({
      where: { movieId },
      create: { movieId, ...probe.video },
      update: { ...probe.video },
    });
  }

  if (probe.audio.length > 0) {
    await prisma.audioTrack.createMany({
      data: probe.audio.map((a) => ({ movieId, ...a })),
    });
  }

  if (probe.subtitles.length > 0) {
    await prisma.subtitleTrack.createMany({
      data: probe.subtitles.map((s) => ({ movieId, ...s })),
    });
  }
}

export async function scanDirectory(rootPath: string): Promise<ScanSummary> {
  const summary: ScanSummary = {
    found: 0,
    newDrafts: 0,
    updated: 0,
    moved: 0,
    skipped: 0,
    errors: [],
  };

  const files = await walkVideoFiles(rootPath);
  summary.found = files.length;

  for (const filePath of files) {
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
        summary.skipped++;
        continue;
      }

      let fileHash = existing?.fileHash ?? null;
      const needsHash =
        !existing ||
        existing.fileSize !== fileSize ||
        existing.fileMtime?.getTime() !== fileMtime.getTime();

      if (needsHash) {
        fileHash = await computeFileHashPrefix(filePath);
      }

      const movedMovie =
        fileHash &&
        (await prisma.movie.findFirst({
          where: {
            fileHash,
            NOT: { filePath },
          },
        }));

      const parentFolder = path.basename(path.dirname(filePath));
      const fileName = path.basename(filePath);
      const parsed = parseMovieName(fileName, parentFolder);

      let probe;
      try {
        probe = await probeMediaFile(filePath);
      } catch (err) {
        summary.errors.push(
          `${fileName}: ffprobe failed — ${err instanceof Error ? err.message : "unknown"}`,
        );
        probe = { durationSeconds: null, video: null, audio: [], subtitles: [] };
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
          },
        });
        await upsertTracks(movedMovie.id, probe);
        summary.moved++;
        continue;
      }

      if (existing) {
        await prisma.movie.update({
          where: { id: existing.id },
          data: {
            fileSize,
            fileMtime,
            fileHash,
            durationSeconds: probe.durationSeconds,
          },
        });
        await upsertTracks(existing.id, probe);
        summary.updated++;
        continue;
      }

      const movie = await prisma.movie.create({
        data: {
          title: parsed.title,
          year: parsed.year,
          releaseType: parsed.releaseType,
          durationSeconds: probe.durationSeconds,
          filePath,
          fileSize,
          fileMtime,
          fileHash,
          status: MovieStatus.DRAFT,
        },
      });
      await upsertTracks(movie.id, probe);
      summary.newDrafts++;
    } catch (err) {
      summary.errors.push(
        `${filePath}: ${err instanceof Error ? err.message : "unknown error"}`,
      );
    }
  }

  return summary;
}
