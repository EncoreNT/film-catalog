import { prisma } from "@/lib/db/prisma";
import { releaseCreateSchema } from "@/lib/api/validators";
import { releaseInclude } from "@/lib/movies/movie-include";
import { maybeExtractCover } from "@/lib/covers/cover-storage";
import { createReleaseWithTracks } from "@/lib/releases/release-api";
import type { z } from "zod";

type ReleaseCreateInput = z.infer<typeof releaseCreateSchema>;

export async function createRelease(movieId: number, data: ReleaseCreateInput) {
  const movie = await prisma.movie.findUnique({
    where: { id: movieId },
    select: { id: true, coverPath: true },
  });
  if (!movie) {
    throw new Error("Фильм не найден");
  }

  const release = await prisma.$transaction(async (tx) => {
    const created = await createReleaseWithTracks(tx, movieId, data);
    return tx.release.findUnique({
      where: { id: created.id },
      include: releaseInclude,
    });
  });

  const trimmedPath = data.filePath?.trim();
  if (trimmedPath && !movie.coverPath) {
    try {
      await maybeExtractCover(movieId, trimmedPath, false);
    } catch {
      // non-fatal
    }
  }

  return release;
}
