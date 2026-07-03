import type { Prisma } from "@/generated/prisma/client";
import { countArchiveMetrics } from "@/lib/catalog/archive-metrics";

function franchiseMovieWhere(franchiseId: number): Prisma.MovieWhereInput {
  return {
    slots: { some: { franchiseId } },
  };
}

export async function getFranchiseMetrics(franchiseId: number) {
  return countArchiveMetrics(franchiseMovieWhere(franchiseId));
}
