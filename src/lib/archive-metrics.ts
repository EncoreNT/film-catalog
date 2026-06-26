import type { Prisma } from "@/generated/prisma/client";
import { MovieStatus } from "@/generated/prisma/client";
import { prisma } from "./prisma";

export interface ArchiveMetrics {
  fourK: number;
  hdr10: number;
  russianAtmos: number;
  elite: number;
}

const catalogWhere = { status: MovieStatus.CATALOG } as const;

const russianAtmosAudioWhere = {
  audioTracks: {
    some: {
      isDefault: true,
      language: "rus",
      profile: { in: ["Atmos", "DTS:X MA"] as const },
    },
  },
} satisfies Prisma.MovieWhereInput;

const eliteTierWhere = {
  ...catalogWhere,
  AND: [
    { videoTrack: { resolutionLabel: "4K" } },
    { videoTrack: { hdr: { notIn: ["SDR"] } } },
    russianAtmosAudioWhere,
  ],
} satisfies Prisma.MovieWhereInput;

export async function getArchiveMetrics(): Promise<ArchiveMetrics> {
  const [fourK, hdr10, russianAtmos, elite] = await Promise.all([
    prisma.movie.count({
      where: {
        ...catalogWhere,
        videoTrack: { resolutionLabel: "4K" },
      },
    }),
    prisma.movie.count({
      where: {
        ...catalogWhere,
        videoTrack: { hdr: { in: ["HDR10", "HDR10+"] } },
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
  const [totalCount, catalogCount, draftCount] = await Promise.all([
    prisma.movie.count(),
    prisma.movie.count({ where: { status: MovieStatus.CATALOG } }),
    prisma.movie.count({ where: { status: MovieStatus.DRAFT } }),
  ]);
  return { totalCount, catalogCount, draftCount };
}
