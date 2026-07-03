import type { Prisma } from "@/generated/prisma/client";
import { movieInclude } from "@/lib/movies/movie-include";

export const franchiseInclude = {
  slots: {
    include: {
      movie: { include: movieInclude },
    },
    orderBy: { storyOrder: "asc" as const },
  },
} satisfies Prisma.FranchiseInclude;

export type FranchiseWithSlots = Prisma.FranchiseGetPayload<{
  include: typeof franchiseInclude;
}>;
