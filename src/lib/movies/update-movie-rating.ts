import { prisma } from "@/lib/db/prisma";
import { movieInclude } from "@/lib/movies/movie-include";

export async function setMovieRating(
  movieId: number,
  raterId: number,
  rating: number,
) {
  if (rating < 1 || rating > 10) {
    throw new Error("Оценка должна быть от 1 до 10");
  }

  return prisma.$transaction(async (tx) => {
    const movie = await tx.movie.findUnique({ where: { id: movieId } });
    if (!movie) throw new Error("Фильм не найден");

    const rater = await tx.rater.findUnique({ where: { id: raterId } });
    if (!rater) throw new Error("Оценщик не найден");

    await tx.movieRating.upsert({
      where: { movieId_raterId: { movieId, raterId } },
      create: { movieId, raterId, rating },
      update: { rating },
    });

    return tx.movie.findUnique({
      where: { id: movieId },
      include: movieInclude,
    });
  });
}

export async function clearMovieRating(movieId: number, raterId: number) {
  return prisma.$transaction(async (tx) => {
    const movie = await tx.movie.findUnique({ where: { id: movieId } });
    if (!movie) throw new Error("Фильм не найден");

    await tx.movieRating.deleteMany({
      where: { movieId, raterId },
    });

    return tx.movie.findUnique({
      where: { id: movieId },
      include: movieInclude,
    });
  });
}
