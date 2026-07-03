import { prisma } from "@/lib/db/prisma";
import { movieUpdateSchema } from "@/lib/api/validators";
import { movieInclude } from "@/lib/movies/movie-include";
import { syncMovieGenres } from "@/lib/movies/sync-movie-genres";
import { resolveMovieSlug } from "@/lib/movies/movie-slug";
import { computeMatchKey } from "@/lib/movies/movie-match-key";
import type { z } from "zod";

type MovieUpdateInput = z.infer<typeof movieUpdateSchema>;

export async function updateMovie(movieId: number, data: MovieUpdateInput) {
  const { genres, watchedAt, ...movieData } = data;
  const genreNames = genres ?? null;

  const existing = await prisma.movie.findUnique({
    where: { id: movieId },
    select: { title: true, year: true },
  });
  if (!existing) {
    throw new Error("Фильм не найден");
  }

  const nextTitle = movieData.title ?? existing.title;
  const nextYear =
    movieData.year !== undefined ? movieData.year : existing.year;
  const matchKey = computeMatchKey(nextTitle, nextYear);

  return prisma.$transaction(async (tx) => {
    const slug =
      movieData.title !== undefined
        ? await resolveMovieSlug(tx, movieData.title, movieId)
        : undefined;

    await tx.movie.update({
      where: { id: movieId },
      data: {
        ...movieData,
        slug,
        matchKey,
        watchedAt:
          watchedAt === undefined
            ? undefined
            : watchedAt
              ? new Date(watchedAt)
              : null,
      },
    });

    if (genreNames !== null) {
      await syncMovieGenres(tx, movieId, genreNames);
    }

    return tx.movie.findUnique({
      where: { id: movieId },
      include: movieInclude,
    });
  });
}
