import type { Prisma } from "@/generated/prisma/client";
import { MovieStatus } from "@/generated/prisma/client";
import { prisma } from "@/lib/db/prisma";
import { getCatalogFacets } from "@/lib/catalog/catalog-facets";
import {
  archiveEliteTierWhere,
  russianAtmosAudioWhere,
} from "@/lib/media/quality-predicates";

export interface ArchiveMetrics {
  fourK: number;
  hdr10: number;
  russianAtmos: number;
  elite: number;
}

export const catalogWhere = { status: MovieStatus.CATALOG } as const;

/** @deprecated Use archiveEliteTierWhere from quality-predicates — kept for imports. */
export const eliteTierWhere = {
  ...catalogWhere,
  ...archiveEliteTierWhere,
} satisfies Prisma.MovieWhereInput;

export { russianAtmosAudioWhere } from "@/lib/media/quality-predicates";

export async function countArchiveMetrics(
  extraWhere?: Prisma.MovieWhereInput,
): Promise<ArchiveMetrics> {
  const scopedWhere: Prisma.MovieWhereInput = extraWhere
    ? { AND: [catalogWhere, extraWhere] }
    : catalogWhere;

  const [fourK, hdr10, russianAtmos, elite] = await Promise.all([
    prisma.movie.count({
      where: {
        ...scopedWhere,
        releases: {
          some: { videoTrack: { resolutionLabel: "4K" } },
        },
      },
    }),
    prisma.movie.count({
      where: {
        ...scopedWhere,
        releases: {
          some: { videoTrack: { hdr: { in: ["HDR10", "HDR10+"] } } },
        },
      },
    }),
    prisma.movie.count({
      where: {
        ...scopedWhere,
        ...russianAtmosAudioWhere,
      },
    }),
    prisma.movie.count({
      where: {
        ...scopedWhere,
        ...archiveEliteTierWhere,
      },
    }),
  ]);

  return { fourK, hdr10, russianAtmos, elite };
}

export async function getArchiveMetrics(): Promise<ArchiveMetrics> {
  return countArchiveMetrics();
}

export async function getStatusCounts() {
  const [totalCount, catalogCount, draftCount, excludedCount] = await Promise.all([
    prisma.movie.count(),
    prisma.movie.count({ where: { status: MovieStatus.CATALOG } }),
    prisma.movie.count({ where: { status: MovieStatus.DRAFT } }),
    prisma.movie.count({ where: { status: MovieStatus.EXCLUDED } }),
  ]);
  return { totalCount, catalogCount, draftCount, excludedCount };
}

export async function getStatsOverview() {
  const [
    statusCounts,
    withoutCover,
    watched,
    avgRating,
    facets,
  ] = await Promise.all([
    getStatusCounts(),
    prisma.movie.count({
      where: { coverPath: null, status: MovieStatus.CATALOG },
    }),
    prisma.movie.count({ where: { watchedAt: { not: null } } }),
    prisma.movie.aggregate({
      _avg: { rating: true },
      where: { rating: { not: null } },
    }),
    getCatalogFacets(),
  ]);

  return {
    total: statusCounts.totalCount,
    catalog: statusCounts.catalogCount,
    draft: statusCounts.draftCount,
    excluded: statusCounts.excludedCount,
    withoutCover,
    watched,
    avgRating: avgRating._avg.rating,
    facets,
  };
}
