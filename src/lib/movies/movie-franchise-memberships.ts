import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/db/prisma";

type DbClient = Prisma.TransactionClient | typeof prisma;

export interface MovieFranchiseMembership {
  /** FranchiseSlot id this movie occupies in the franchise. */
  slotId: number;
  franchiseId: number;
  franchiseName: string;
  franchiseSlug: string;
  /** 1-based position of this movie within the franchise's ordered slot list. */
  position: number;
  /** Total slots in the franchise (including placeholder slots). */
  totalInFranchise: number;
}

/**
 * Returns the franchises a movie belongs to, with the movie's position inside
 * each franchise's ordered slot list. Used by the movie editor's franchise
 * picker and the membership API.
 */
export async function getMovieFranchiseMemberships(
  db: DbClient,
  movieId: number,
): Promise<MovieFranchiseMembership[]> {
  const slots = await db.franchiseSlot.findMany({
    where: { movieId },
    include: {
      franchise: {
        include: {
          slots: {
            select: { storyOrder: true, movieId: true },
            orderBy: { storyOrder: "asc" },
          },
        },
      },
    },
    orderBy: { franchise: { name: "asc" } },
  });

  return slots.map((slot) => {
    const ordered = slot.franchise.slots;
    const index = ordered.findIndex((s) => s.movieId === movieId);
    return {
      slotId: slot.id,
      franchiseId: slot.franchiseId,
      franchiseName: slot.franchise.name,
      franchiseSlug: slot.franchise.slug,
      position: index >= 0 ? index + 1 : ordered.length,
      totalInFranchise: ordered.length,
    };
  });
}
