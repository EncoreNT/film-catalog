import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/db/prisma";
import { assertWatchDateAllowed } from "@/lib/movies/movie-watch-date";

async function upsertWatchDay(
  tx: Prisma.TransactionClient,
  movieId: number,
  watchedOn: Date,
): Promise<{ id: number; created: boolean }> {
  const existing = await tx.movieWatch.findUnique({
    where: { movieId_watchedOn: { movieId, watchedOn } },
    select: { id: true },
  });
  if (existing) return { id: existing.id, created: false };

  const created = await tx.movieWatch.create({
    data: { movieId, watchedOn },
  });
  return { id: created.id, created: true };
}

export async function recordMovieWatch(movieId: number, isoDate: string) {
  const watchedOn = assertWatchDateAllowed(isoDate);

  return prisma.$transaction(async (tx) => {
    const movie = await tx.movie.findUnique({
      where: { id: movieId },
      select: { id: true },
    });
    if (!movie) throw new Error("Фильм не найден");

    const row = await upsertWatchDay(tx, movieId, watchedOn);
    const watchCount = await tx.movieWatch.count({ where: { movieId } });

    return {
      created: row.created,
      id: row.id,
      watchedOn: isoDate,
      watchCount,
    };
  });
}

const DUPLICATE_WATCH_DAY = "В этот день просмотр уже записан";

export async function deleteMovieWatch(movieId: number, watchId: number) {
  // Scope by both IDs. Repeating a successful deletion is safe.
  await prisma.movieWatch.deleteMany({ where: { id: watchId, movieId } });
}

export async function moveMovieWatch(
  movieId: number,
  watchId: number,
  isoDate: string,
) {
  const watchedOn = assertWatchDateAllowed(isoDate);

  return prisma.$transaction(async (tx) => {
    const movie = await tx.movie.findUnique({
      where: { id: movieId },
      select: { id: true },
    });
    if (!movie) throw new Error("Фильм не найден");

    const watch = await tx.movieWatch.findFirst({
      where: { id: watchId, movieId },
      select: { id: true, watchedOn: true },
    });
    if (!watch) throw new Error("Просмотр не найден");

    if (watch.watchedOn.getTime() === watchedOn.getTime()) {
      return { id: watch.id, watchedOn: isoDate };
    }

    const clash = await tx.movieWatch.findUnique({
      where: { movieId_watchedOn: { movieId, watchedOn } },
      select: { id: true },
    });
    if (clash) throw new Error(DUPLICATE_WATCH_DAY);

    await tx.movieWatch.update({
      where: { id: watch.id },
      data: { watchedOn },
    });

    return { id: watch.id, watchedOn: isoDate };
  });
}

/** Move viewing days onto the canonical movie. Same day on both sides stays once. */
export async function adoptMovieWatches(
  tx: Prisma.TransactionClient,
  canonicalId: number,
  otherId: number,
): Promise<void> {
  const otherWatches = await tx.movieWatch.findMany({
    where: { movieId: otherId },
  });

  for (const row of otherWatches) {
    const existing = await tx.movieWatch.findUnique({
      where: {
        movieId_watchedOn: {
          movieId: canonicalId,
          watchedOn: row.watchedOn,
        },
      },
      select: { id: true },
    });

    if (!existing) {
      await tx.movieWatch.update({
        where: { id: row.id },
        data: { movieId: canonicalId },
      });
    } else {
      await tx.movieWatch.delete({ where: { id: row.id } });
    }
  }
}
