import type { Prisma } from "@/generated/prisma/client";
import type { RemakeRole } from "@/generated/prisma/client";
import { prisma } from "@/lib/db/prisma";

type DbClient = Prisma.TransactionClient | typeof prisma;

export interface CatalogRemakeBadge {
  role: RemakeRole;
  groupId: number;
  groupName: string;
  groupSize: number;
  coMembers: {
    movieId: number;
    movieTitle: string;
    movieSlug: string;
    movieYear: number | null;
    role: RemakeRole;
  }[];
}

export type CatalogRemakeBadgeMap = Map<number, CatalogRemakeBadge>;

/**
 * Batch-loads remake badge data for catalog cards.
 * One query per catalog page — avoids N+1 on movieInclude.
 */
export async function getCatalogRemakeBadges(
  movieIds: number[],
  db: DbClient = prisma,
): Promise<CatalogRemakeBadgeMap> {
  if (movieIds.length === 0) return new Map();

  const memberships = await db.remakeMember.findMany({
    where: { movieId: { in: movieIds } },
    include: {
      group: {
        include: {
          members: {
            include: {
              movie: {
                select: {
                  id: true,
                  title: true,
                  slug: true,
                  year: true,
                },
              },
            },
          },
        },
      },
    },
  });

  const result: CatalogRemakeBadgeMap = new Map();

  for (const membership of memberships) {
    const coMembers = membership.group.members
      .filter((m) => m.movieId !== membership.movieId)
      .map((m) => ({
        movieId: m.movieId,
        movieTitle: m.movie.title,
        movieSlug: m.movie.slug,
        movieYear: m.movie.year,
        role: m.role,
      }));

    result.set(membership.movieId, {
      role: membership.role,
      groupId: membership.groupId,
      groupName: membership.group.name,
      groupSize: membership.group.members.length,
      coMembers,
    });
  }

  return result;
}
