import { copyFile, access } from "fs/promises";
import path from "path";
import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "./prisma";
import { movieInclude } from "./movie-include";
import { dataPath } from "./data-path";

type Db = Prisma.TransactionClient | typeof prisma;

export interface MergeFieldChoice {
  description?: "canonical" | "other";
  coverPath?: "canonical" | "other";
  rating?: "canonical" | "other";
  watchedAt?: "canonical" | "other";
}

export interface MergePlan {
  canonicalId: number;
  otherId: number;
  canonicalReleaseCount: number;
  otherReleaseCount: number;
  conflicts: {
    description: boolean;
    coverPath: boolean;
    rating: boolean;
    watchedAt: boolean;
    franchiseSlots: boolean;
  };
}

export function planMerge(
  canonical: {
    id: number;
    description: string | null;
    coverPath: string | null;
    rating: number | null;
    watchedAt: Date | null;
    _count: { releases: number };
  },
  other: {
    id: number;
    description: string | null;
    coverPath: string | null;
    rating: number | null;
    watchedAt: Date | null;
    _count: { releases: number };
  },
  canonicalSlotFranchiseIds: number[],
  otherSlotFranchiseIds: number[],
): MergePlan {
  const slotOverlap = canonicalSlotFranchiseIds.some((id) =>
    otherSlotFranchiseIds.includes(id),
  );

  return {
    canonicalId: canonical.id,
    otherId: other.id,
    canonicalReleaseCount: canonical._count.releases,
    otherReleaseCount: other._count.releases,
    conflicts: {
      description: !!canonical.description && !!other.description,
      coverPath: !!canonical.coverPath && !!other.coverPath,
      rating: canonical.rating != null && other.rating != null,
      watchedAt: canonical.watchedAt != null && other.watchedAt != null,
      franchiseSlots: slotOverlap,
    },
  };
}

async function adoptCoverFromOther(
  tx: Prisma.TransactionClient,
  canonicalId: number,
  otherCoverPath: string,
) {
  const ext = path.extname(otherCoverPath);
  const destRelative = `covers/${canonicalId}${ext}`;
  const srcAbs = dataPath(otherCoverPath.replace(/^covers\//, "covers/"));
  const destAbs = dataPath(destRelative.replace(/^covers\//, "covers/"));

  try {
    await access(srcAbs);
    await copyFile(srcAbs, destAbs);
    await tx.movie.update({
      where: { id: canonicalId },
      data: { coverPath: destRelative },
    });
  } catch {
    await tx.movie.update({
      where: { id: canonicalId },
      data: { coverPath: otherCoverPath },
    });
  }
}

export async function mergeMovies(
  canonicalId: number,
  otherId: number,
  choices: MergeFieldChoice = {},
  db: Db = prisma,
) {
  if (canonicalId === otherId) {
    throw new Error("Нельзя объединить фильм с самим собой");
  }

  const run = async (tx: Prisma.TransactionClient) => {
    const [canonical, other] = await Promise.all([
      tx.movie.findUnique({
        where: { id: canonicalId },
        include: { _count: { select: { releases: true } } },
      }),
      tx.movie.findUnique({
        where: { id: otherId },
        include: { _count: { select: { releases: true } } },
      }),
    ]);

    if (!canonical || !other) {
      throw new Error("Фильм не найден");
    }

    await tx.release.updateMany({
      where: { movieId: otherId },
      data: { movieId: canonicalId },
    });

    const otherGenres = await tx.movieGenre.findMany({
      where: { movieId: otherId },
    });
    for (const mg of otherGenres) {
      await tx.movieGenre.upsert({
        where: {
          movieId_genreId: { movieId: canonicalId, genreId: mg.genreId },
        },
        create: {
          movieId: canonicalId,
          genreId: mg.genreId,
          sortOrder: mg.sortOrder,
        },
        update: {},
      });
    }
    await tx.movieGenre.deleteMany({ where: { movieId: otherId } });

    const otherSlots = await tx.franchiseSlot.findMany({
      where: { movieId: otherId },
    });
    for (const slot of otherSlots) {
      const conflict = await tx.franchiseSlot.findFirst({
        where: { franchiseId: slot.franchiseId, movieId: canonicalId },
      });
      if (!conflict) {
        await tx.franchiseSlot.update({
          where: { id: slot.id },
          data: { movieId: canonicalId },
        });
      } else {
        await tx.franchiseSlot.update({
          where: { id: slot.id },
          data: { movieId: null },
        });
      }
    }

    const pick = <T>(
      field: keyof MergeFieldChoice,
      canonicalVal: T,
      otherVal: T,
    ): T => {
      const choice = choices[field];
      if (choice === "other") return otherVal;
      return canonicalVal ?? otherVal;
    };

    const nextDescription = pick(
      "description",
      canonical.description,
      other.description,
    );
    const nextRating = pick("rating", canonical.rating, other.rating);
    const nextWatchedAt = pick(
      "watchedAt",
      canonical.watchedAt,
      other.watchedAt,
    );

    let nextCoverPath = canonical.coverPath;
    if (choices.coverPath === "other" && other.coverPath) {
      nextCoverPath = other.coverPath;
    } else if (!canonical.coverPath && other.coverPath) {
      nextCoverPath = other.coverPath;
    } else if (
      choices.coverPath !== "canonical" &&
      !canonical.coverPath &&
      other.coverPath
    ) {
      nextCoverPath = other.coverPath;
    }

    await tx.movie.update({
      where: { id: canonicalId },
      data: {
        description: nextDescription,
        rating: nextRating,
        watchedAt: nextWatchedAt,
        coverPath: nextCoverPath,
      },
    });

    if (
      !canonical.coverPath &&
      other.coverPath &&
      (choices.coverPath === "other" || !choices.coverPath)
    ) {
      await adoptCoverFromOther(tx, canonicalId, other.coverPath);
    }

    await tx.movie.delete({ where: { id: otherId } });

    return tx.movie.findUnique({
      where: { id: canonicalId },
      include: movieInclude,
    });
  };

  if ("$transaction" in db) {
    return db.$transaction(run);
  }
  return run(db as Prisma.TransactionClient);
}
