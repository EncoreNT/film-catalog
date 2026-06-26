import { prisma } from "./prisma";
import { MovieStatus } from "@/generated/prisma/client";

export interface FacetOption {
  value: string | null;
  count: number;
}

export interface CatalogFacets {
  resolutions: FacetOption[];
  audioLanguages: FacetOption[];
  subtitleLanguages: FacetOption[];
  channelLayouts: FacetOption[];
}

export interface CatalogGenreFacet {
  value: string;
  count: number;
}

export async function getCatalogFacets(): Promise<CatalogFacets> {
  const [resolutions, audioLanguages, subtitleLanguages, channelLayouts] =
    await Promise.all([
      prisma.videoTrack.groupBy({
        by: ["resolutionLabel"],
        _count: true,
        where: { resolutionLabel: { not: null } },
      }),
      prisma.audioTrack.groupBy({
        by: ["language"],
        _count: true,
        where: { language: { not: null } },
      }),
      prisma.subtitleTrack.groupBy({
        by: ["language"],
        _count: true,
        where: { language: { not: null } },
      }),
      prisma.audioTrack.groupBy({
        by: ["channelLayout"],
        _count: true,
        where: { channelLayout: { not: null } },
      }),
    ]);

  return {
    resolutions: resolutions.map((row) => ({
      value: row.resolutionLabel,
      count: row._count,
    })),
    audioLanguages: audioLanguages.map((row) => ({
      value: row.language,
      count: row._count,
    })),
    subtitleLanguages: subtitleLanguages.map((row) => ({
      value: row.language,
      count: row._count,
    })),
    channelLayouts: channelLayouts.map((row) => ({
      value: row.channelLayout,
      count: row._count,
    })),
  };
}

export async function getCatalogGenreFacets(): Promise<CatalogGenreFacet[]> {
  const genres = await prisma.genre.findMany({
    where: { movies: { some: { status: MovieStatus.CATALOG } } },
    select: { name: true, _count: { select: { movies: true } } },
    orderBy: { name: "asc" },
  });

  return genres.map((genre) => ({
    value: genre.name,
    count: genre._count.movies,
  }));
}
