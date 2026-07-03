import { prisma } from "@/lib/db/prisma";
import { findReleaseForMovie } from "@/lib/releases/probe-release";

export async function deleteRelease(movieId: number, releaseId: number) {
  const release = await findReleaseForMovie(prisma, movieId, releaseId);
  if (!release) {
    throw new Error("Релиз не найден");
  }

  const count = await prisma.release.count({ where: { movieId } });
  if (count <= 1) {
    throw new Error("Нельзя удалить единственный релиз фильма");
  }

  await prisma.release.delete({ where: { id: releaseId } });
}
