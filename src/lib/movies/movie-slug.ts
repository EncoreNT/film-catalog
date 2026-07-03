import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/db/prisma";
import { resolveEntitySlug } from "@/lib/shared/slug";

type DbClient = Prisma.TransactionClient | typeof prisma;

export async function resolveMovieSlug(
  db: DbClient,
  title: string,
  excludeId?: number,
): Promise<string> {
  return resolveEntitySlug(db, { table: "movie", text: title, excludeId });
}

export interface RecomputeMovieSlugsResult {
  total: number;
  updated: number;
}

export async function recomputeAllMovieSlugs(
  db: DbClient = prisma,
): Promise<RecomputeMovieSlugsResult> {
  const movies = await db.movie.findMany({
    select: { id: true, title: true },
    orderBy: { id: "asc" },
  });

  let updated = 0;
  for (const movie of movies) {
    const slug = await resolveMovieSlug(db, movie.title, movie.id);
    const current = await db.movie.findUnique({
      where: { id: movie.id },
      select: { slug: true },
    });
    if (current?.slug !== slug) {
      await db.movie.update({
        where: { id: movie.id },
        data: { slug },
      });
      updated += 1;
    }
  }

  return { total: movies.length, updated };
}
