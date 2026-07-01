import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "./prisma";

type Db = Prisma.TransactionClient | typeof prisma;

/**
 * Resolve genre names to their row ids, upserting any missing ones.
 * Names are normalized (trimmed + lowercased) so duplicates collapse.
 * The returned array preserves the input order (first occurrence wins).
 */
export async function upsertGenresByNames(
  names: string[],
  db: Db = prisma,
): Promise<{ id: number; name: string }[]> {
  const unique: string[] = [];
  const seen = new Set<string>();
  for (const raw of names) {
    const name = raw.trim().toLowerCase();
    if (!name || seen.has(name)) continue;
    seen.add(name);
    unique.push(name);
  }
  if (unique.length === 0) return [];

  const rows = await Promise.all(
    unique.map((name) =>
      db.genre.upsert({
        where: { name },
        create: { name },
        update: {},
        select: { id: true, name: true },
      }),
    ),
  );
  return rows;
}

/** Replace a movie's genre links with an ordered list of genre names. */
export async function syncMovieGenres(
  db: Db,
  movieId: number,
  names: string[],
): Promise<void> {
  const genreRows = await upsertGenresByNames(names, db);
  await db.movieGenre.deleteMany({ where: { movieId } });
  if (genreRows.length === 0) return;

  await db.movieGenre.createMany({
    data: genreRows.map((genre, index) => ({
      movieId,
      genreId: genre.id,
      sortOrder: index,
    })),
  });
}
