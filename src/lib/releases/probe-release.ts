import type { PrismaClient } from "@/generated/prisma/client";
import { prisma } from "@/lib/db/prisma";
import { releaseInclude } from "@/lib/movies/movie-include";
import { syncReleaseTracksFromProbe } from "@/lib/releases/movie-tracks";
import { probeMediaFile } from "@/lib/media/ffprobe";

type ReleaseDb = Pick<PrismaClient, "release" | "$transaction">;

export async function findReleaseForMovie(
  db: Pick<PrismaClient, "release">,
  movieId: number,
  releaseId: number,
) {
  return db.release.findFirst({
    where: { id: releaseId, movieId },
    select: { id: true, filePath: true },
  });
}

export async function probeRelease(
  movieId: number,
  releaseId: number,
  db: ReleaseDb = prisma,
) {
  const release = await findReleaseForMovie(db, movieId, releaseId);
  if (!release) {
    throw new Error("Релиз не найден");
  }
  if (!release.filePath) {
    throw new Error("У релиза не указан путь к файлу");
  }

  const probe = await probeMediaFile(release.filePath);
  await db.$transaction(async (tx) => {
    await tx.release.update({
      where: { id: releaseId },
      data: { durationSeconds: probe.durationSeconds },
    });
    await syncReleaseTracksFromProbe(tx, releaseId, probe);
  });

  return db.release.findUnique({
    where: { id: releaseId },
    include: releaseInclude,
  });
}
