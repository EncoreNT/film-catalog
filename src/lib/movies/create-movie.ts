import { prisma } from "@/lib/db/prisma";
import { movieCreateSchema } from "@/lib/api/validators";
import { MovieStatus } from "@/generated/prisma/client";
import { maybeExtractCover } from "@/lib/covers/cover-storage";
import { movieInclude } from "@/lib/movies/movie-include";
import { syncMovieGenres } from "@/lib/movies/sync-movie-genres";
import { resolveMovieSlug } from "@/lib/movies/movie-slug";
import { computeMatchKey } from "@/lib/movies/movie-match-key";
import {
  createReleaseWithTracks,
  extractReleaseInputFromMovieCreate,
  readReleaseFileMeta,
} from "@/lib/releases/release-api";
import { loadMovieFileMeta } from "@/lib/releases/load-movie-file-meta";
import { probeMediaFile } from "@/lib/media/ffprobe";
import type { z } from "zod";

type MovieCreateInput = z.infer<typeof movieCreateSchema>;

export async function probeOnlyMovie(data: MovieCreateInput) {
  const releaseInput = extractReleaseInputFromMovieCreate(data);
  const filePath = releaseInput?.filePath ?? data.filePath;
  if (!filePath?.trim()) {
    throw new Error("Укажите путь к файлу для автозаполнения");
  }
  try {
    const { assertMovieFileReadable } = await loadMovieFileMeta();
    await assertMovieFileReadable(filePath);
  } catch {
    throw new Error("Файл не найден по указанному пути");
  }
  const probe = await probeMediaFile(filePath);
  const meta = await readReleaseFileMeta(filePath);
  return {
    durationSeconds: probe.durationSeconds,
    video: probe.video,
    audio: probe.audio,
    subtitles: probe.subtitles,
    fileSize: meta.fileSize,
    fileMtime: meta.fileMtime?.toISOString(),
    fileHash: meta.fileHash,
  };
}

export async function createMovie(data: MovieCreateInput) {
  const releaseInput = extractReleaseInputFromMovieCreate(data);
  const genreNames = data.genres ?? [];
  const slug = await resolveMovieSlug(prisma, data.title);
  const matchKey = computeMatchKey(data.title, data.year ?? null);

  const movie = await prisma.$transaction(async (tx) => {
    const created = await tx.movie.create({
      data: {
        slug,
        title: data.title,
        year: data.year ?? null,
        description: data.description ?? null,
        matchKey,
        status: data.status ?? MovieStatus.CATALOG,
      },
    });

    if (releaseInput) {
      await createReleaseWithTracks(tx, created.id, releaseInput);
    }

    if (genreNames.length > 0) {
      await syncMovieGenres(tx, created.id, genreNames);
    }

    return tx.movie.findUnique({
      where: { id: created.id },
      include: movieInclude,
    });
  });

  const trimmedPath = releaseInput?.filePath?.trim();
  if (trimmedPath && movie && !movie.coverPath) {
    try {
      await maybeExtractCover(movie.id, trimmedPath, false);
    } catch {
      // non-fatal
    }
  }

  return (
    movie ??
    (await prisma.movie.findUnique({
      where: { slug },
      include: movieInclude,
    }))
  );
}
