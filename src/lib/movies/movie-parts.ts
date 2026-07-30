import type { Prisma } from "@/generated/prisma/client";
import type { moviePartInputSchema } from "@/lib/api/validators/movie";
import type { z } from "zod";

type Db = Prisma.TransactionClient;

export type MoviePartInput = z.infer<typeof moviePartInputSchema>;

/** Upsert a series row for scan / import. */
export async function ensureMoviePart(
  db: Db,
  movieId: number,
  partNumber: number,
): Promise<{ id: number }> {
  return db.moviePart.upsert({
    where: {
      movieId_partNumber: { movieId, partNumber },
    },
    create: { movieId, partNumber },
    update: {},
    select: { id: true },
  });
}

/** Recompute denormalized partCount on Movie (null when single-part). */
export async function recomputeMoviePartCount(
  db: Db,
  movieId: number,
  hintTotal?: number | null,
): Promise<number | null> {
  const agg = await db.moviePart.aggregate({
    where: { movieId },
    _max: { partNumber: true },
    _count: { _all: true },
  });

  const maxPart = agg._max.partNumber ?? 0;
  const fromParts = Math.max(agg._count._all, maxPart);
  const count = Math.max(fromParts, hintTotal ?? 0);

  const partCount = count > 1 ? count : null;
  await db.movie.update({
    where: { id: movieId },
    data: { partCount },
  });
  return partCount;
}

/** Full replace of part metadata (does not move releases between parts). */
export async function syncMovieParts(
  db: Db,
  movieId: number,
  parts: MoviePartInput[],
  partCountOverride?: number | null,
) {
  const sorted = [...parts].sort((a, b) => a.partNumber - b.partNumber);

  await db.moviePart.deleteMany({ where: { movieId } });

  if (sorted.length > 0) {
    await db.moviePart.createMany({
      data: sorted.map((part) => ({
        movieId,
        partNumber: part.partNumber,
        title: part.title?.trim() ? part.title.trim() : null,
      })),
    });
  }

  if (partCountOverride !== undefined) {
    const partCount =
      partCountOverride != null && partCountOverride > 1
        ? partCountOverride
        : null;
    await db.movie.update({
      where: { id: movieId },
      data: { partCount },
    });
    return;
  }

  await recomputeMoviePartCount(db, movieId);
}

export type PartReleaseAssignmentInput = {
  partNumber: number;
  releaseIds: number[];
};

/** Assign releases to parts (each release at most one part); clears previous links. */
export async function syncMoviePartReleaseLinks(
  db: Db,
  movieId: number,
  assignments: PartReleaseAssignmentInput[],
) {
  const parts = await db.moviePart.findMany({
    where: { movieId },
    select: { id: true, partNumber: true },
  });
  const partIdByNumber = new Map(parts.map((p) => [p.partNumber, p.id]));

  await db.release.updateMany({
    where: { movieId },
    data: { moviePartId: null },
  });

  for (const assignment of assignments) {
    const partId = partIdByNumber.get(assignment.partNumber);
    if (!partId) continue;

    const uniqueIds = [...new Set(assignment.releaseIds)];
    for (const releaseId of uniqueIds) {
      const release = await db.release.findFirst({
        where: { id: releaseId, movieId },
        select: { id: true },
      });
      if (!release) continue;

      await db.release.update({
        where: { id: release.id },
        data: { moviePartId: partId },
      });
    }
  }
}
