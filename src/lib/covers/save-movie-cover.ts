import type { PrismaClient } from "@/generated/prisma/client";
import { saveCoverBuffer } from "@/lib/covers/cover-storage";

type MovieDb = Pick<PrismaClient, "movie">;

export async function saveMovieCover(
  db: MovieDb,
  movieId: number,
  buffer: Buffer,
  ext: string,
) {
  await saveCoverBuffer(movieId, buffer, ext);
  const updated = await db.movie.findUnique({
    where: { id: movieId },
    select: { id: true, slug: true, coverPath: true, updatedAt: true },
  });
  if (!updated) {
    throw new Error("Фильм не найден");
  }

  return updated;
}
