import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";

type DbClient = Prisma.TransactionClient | typeof prisma;

/**
 * Normalized key used to detect duplicate movies (same work, different releases).
 * Lowercases (Unicode-aware, so Cyrillic too), collapses whitespace, appends "|year".
 * Two movies with the same matchKey are merge candidates (variant C: manual confirm).
 */
export function computeMatchKey(title: string, year: number | null): string {
  const normalized = title.toLowerCase().replace(/\s+/g, " ").trim();
  return `${normalized}|${year ?? ""}`;
}

/** Recompute and persist matchKey for a single movie. Returns the new key. */
export async function recomputeMovieMatchKey(
  db: DbClient,
  movieId: number,
  title: string,
  year: number | null,
): Promise<string> {
  const matchKey = computeMatchKey(title, year);
  await db.movie.update({ where: { id: movieId }, data: { matchKey } });
  return matchKey;
}

/** Recompute matchKey for every movie. Used for the one-time post-migration backfill. */
export async function recomputeAllMatchKeys(db: DbClient = prisma): Promise<number> {
  const movies = await db.movie.findMany({ select: { id: true, title: true, year: true } });
  for (const movie of movies) {
    await db.movie.update({
      where: { id: movie.id },
      data: { matchKey: computeMatchKey(movie.title, movie.year) },
    });
  }
  return movies.length;
}
