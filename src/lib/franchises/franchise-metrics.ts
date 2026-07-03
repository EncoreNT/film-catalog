import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/db/prisma";
import {
  type ArchiveMetrics,
  catalogWhere,
  eliteTierWhere,
  russianAtmosAudioWhere,
} from "@/lib/catalog/archive-metrics";

function franchiseMovieWhere(franchiseId: number): Prisma.MovieWhereInput {
  return {
    slots: { some: { franchiseId } },
  };
}

export async function getFranchiseMetrics(
  franchiseId: number,
): Promise<ArchiveMetrics> {
  const franchiseFilter = franchiseMovieWhere(franchiseId);

  const [fourK, hdr10, russianAtmos, elite] = await Promise.all([
    prisma.movie.count({
      where: {
        ...catalogWhere,
        ...franchiseFilter,
        releases: {
          some: { videoTrack: { resolutionLabel: "4K" } },
        },
      },
    }),
    prisma.movie.count({
      where: {
        ...catalogWhere,
        ...franchiseFilter,
        releases: {
          some: { videoTrack: { hdr: { in: ["HDR10", "HDR10+"] } } },
        },
      },
    }),
    prisma.movie.count({
      where: {
        ...catalogWhere,
        ...franchiseFilter,
        ...russianAtmosAudioWhere,
      },
    }),
    prisma.movie.count({
      where: {
        ...eliteTierWhere,
        ...franchiseFilter,
      },
    }),
  ]);

  return { fourK, hdr10, russianAtmos, elite };
}
