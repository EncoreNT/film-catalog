import type { Prisma } from "@/generated/prisma/client";
import { MovieStatus } from "@/generated/prisma/client";
import { prisma } from "@/lib/db/prisma";
import { getCatalogFacets } from "@/lib/catalog/catalog-facets";

export interface ArchiveMetrics {
  fourK: number;
  hdr10: number;
  russianAtmos: number;
  elite: number;
}

export const catalogWhere = { status: MovieStatus.CATALOG } as const;

export const russianAtmosAudioWhere = {
  releases: {
    some: {
      audioTracks: {
        some: {
          isDefault: true,
          language: "rus",
          profile: { in: ["Atmos", "DTS:X MA"] as const },
        },
      },
    },
  },
} satisfies Prisma.MovieWhereInput;

export const eliteTierWhere = {
  ...catalogWhere,
  AND: [
    {
      releases: {
        some: { videoTrack: { resolutionLabel: "4K" } },
      },
    },
    {
      releases: {
        some: { videoTrack: { hdr: { notIn: ["SDR"] } } },
      },
    },
    russianAtmosAudioWhere,
  ],
} satisfies Prisma.MovieWhereInput;

export async function getArchiveMetrics(): Promise<ArchiveMetrics> {
  const [fourK, hdr10, russianAtmos, elite] = await Promise.all([
    prisma.movie.count({
      where: {
        ...catalogWhere,
        releases: {
          some: { videoTrack: { resolutionLabel: "4K" } },
        },
      },
    }),
    prisma.movie.count({
      where: {
        ...catalogWhere,
        releases: {
          some: { videoTrack: { hdr: { in: ["HDR10", "HDR10+"] } } },
        },
      },
    }),
    prisma.movie.count({
      where: {
        ...catalogWhere,
        ...russianAtmosAudioWhere,
      },
    }),
    prisma.movie.count({ where: eliteTierWhere }),
  ]);

  return { fourK, hdr10, russianAtmos, elite };
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
    total,
    catalog,
    draft,
    excluded,
    withoutCover,
    watched,
    avgRating,
    facets,
  ] = await Promise.all([
    prisma.movie.count(),
    prisma.movie.count({ where: { status: MovieStatus.CATALOG } }),
    prisma.movie.count({ where: { status: MovieStatus.DRAFT } }),
    prisma.movie.count({ where: { status: MovieStatus.EXCLUDED } }),
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
    total,
    catalog,
    draft,
    excluded,
    withoutCover,
    watched,
    avgRating: avgRating._avg.rating,
    facets,
  };
}
