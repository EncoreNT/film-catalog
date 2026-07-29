import type { Prisma, RemakeRole } from "@/generated/prisma/client";
import { prisma } from "@/lib/db/prisma";

type DbClient = Prisma.TransactionClient | typeof prisma;

export interface RemakeCoMember {
  movieId: number;
  movieTitle: string;
  movieSlug: string;
  movieYear: number | null;
  role: RemakeRole;
}

export interface MovieRemakeMembership {
  memberId: number;
  groupId: number;
  groupName: string;
  groupSlug: string;
  role: RemakeRole;
  /** Other movies in the same group (excluding the queried movie). */
  coMembers: RemakeCoMember[];
  /** Total members in the group (including the queried movie). */
  groupSize: number;
}

/**
 * Returns remake group memberships for a movie with co-members.
 * Used by movie detail/edit and the membership API.
 */
export async function getMovieRemakeMemberships(
  db: DbClient,
  movieId: number,
): Promise<MovieRemakeMembership[]> {
  const memberships = await db.remakeMember.findMany({
    where: { movieId },
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
            orderBy: { createdAt: "asc" },
          },
        },
      },
    },
    orderBy: { group: { name: "asc" } },
  });

  return memberships.map((membership) => {
    const coMembers: RemakeCoMember[] = membership.group.members
      .filter((m) => m.movieId !== movieId)
      .map((m) => ({
        movieId: m.movieId,
        movieTitle: m.movie.title,
        movieSlug: m.movie.slug,
        movieYear: m.movie.year,
        role: m.role,
      }));

    return {
      memberId: membership.id,
      groupId: membership.groupId,
      groupName: membership.group.name,
      groupSlug: membership.group.slug,
      role: membership.role,
      coMembers,
      groupSize: membership.group.members.length,
    };
  });
}
