import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import { movieInclude } from "@/lib/movies/movie-include";
import { findReleaseForMovie } from "@/lib/releases/probe-release";

export const setPrimaryReleaseSchema = z.object({
  releaseId: z.number().int(),
});

export async function setMoviePrimaryRelease(
  movieId: number,
  releaseId: number,
) {
  const release = await findReleaseForMovie(prisma, movieId, releaseId);
  if (!release) {
    throw new Error("Релиз не найден");
  }

  return prisma.movie.update({
    where: { id: movieId },
    data: { primaryReleaseId: releaseId },
    include: movieInclude,
  });
}
