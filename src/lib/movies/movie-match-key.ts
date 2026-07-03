import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/db/prisma";

type DbClient = Prisma.TransactionClient | typeof prisma;

/** NFC + Unicode-aware lowercasing for title/matchKey/search (SQLite lower() misses Cyrillic). */
export function normalizeMatchKeyTitle(title: string): string {
  return title.normalize("NFC").toLowerCase().replace(/\s+/g, " ").trim();
}

/** Normalized query needle for case-insensitive catalog search via matchKey. */
export function normalizeSearchQuery(q: string): string {
  return normalizeMatchKeyTitle(q);
}

/**
 * Normalized key used to detect duplicate movies (same work, different releases).
 * NFC + Unicode-aware lowercasing (Cyrillic included), collapses whitespace, appends "|year".
 * Always compute in JS — SQLite lower() does not fold non-ASCII letters.
 */
export function computeMatchKey(title: string, year: number | null): string {
  return `${normalizeMatchKeyTitle(title)}|${year ?? ""}`;
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

export interface RecomputeMatchKeysResult {
  total: number;
  updated: number;
}

/** Recompute matchKey for every movie (fixes legacy SQLite lower() backfill). */
export async function recomputeAllMatchKeys(
  db: DbClient = prisma,
): Promise<RecomputeMatchKeysResult> {
  const movies = await db.movie.findMany({
    select: { id: true, title: true, year: true, matchKey: true },
  });
  let updated = 0;
  for (const movie of movies) {
    const next = computeMatchKey(movie.title, movie.year);
    if (movie.matchKey === next) continue;
    await db.movie.update({
      where: { id: movie.id },
      data: { matchKey: next },
    });
    updated++;
  }
  return { total: movies.length, updated };
}
