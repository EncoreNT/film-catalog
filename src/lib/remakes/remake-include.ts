import type { Prisma } from "@/generated/prisma/client";
import { movieInclude } from "@/lib/movies/movie-include";

export const remakeGroupInclude = {
  members: {
    include: {
      movie: { include: movieInclude },
    },
    orderBy: { createdAt: "asc" as const },
  },
} satisfies Prisma.RemakeGroupInclude;

export type RemakeGroupWithMembers = Prisma.RemakeGroupGetPayload<{
  include: typeof remakeGroupInclude;
}>;
