import type { Prisma } from "@/generated/prisma/client";
import { MovieStatus } from "@/generated/prisma/client";
import { prisma } from "@/lib/db/prisma";
import { getCatalogFacets } from "@/lib/catalog/catalog-facets";
import {
  archiveEliteTierWhere,
  archiveGoldTierWhere,
  russianAtmosAudioWhere,
} from "@/lib/media/quality-predicates";
import {
  movieDurationSortKey,
  movieFileSizeSortKey,
  releaseAggregateSortSelect,
} from "@/lib/movies/movie-release-sort";

export interface ArchiveMetrics {
  gold: number;
  hdr10: number;
  russianAtmos: number;
  elite: number;
}

export interface ArchiveTotals {
  durationSeconds: number;
  fileSizeBytes: number;
}

export const catalogWhere = { status: MovieStatus.CATALOG } as const;

export function mergeMovieWhere(
  ...parts: Prisma.MovieWhereInput[]
): Prisma.MovieWhereInput {
  const defined = parts.filter((part) => Object.keys(part).length > 0);
  if (defined.length === 0) return {};
  if (defined.length === 1) return defined[0]!;
  return { AND: defined };
}

/** @deprecated Use archiveEliteTierWhere from quality-predicates — kept for imports. */
export const eliteTierWhere = {
  ...catalogWhere,
  ...archiveEliteTierWhere,
} satisfies Prisma.MovieWhereInput;

export { russianAtmosAudioWhere } from "@/lib/media/quality-predicates";

export async function countArchiveMetrics(
  extraWhere?: Prisma.MovieWhereInput,
): Promise<ArchiveMetrics> {
  const scopedWhere = extraWhere
    ? mergeMovieWhere(catalogWhere, extraWhere)
    : catalogWhere;

  const [gold, hdr10, russianAtmos, elite] = await Promise.all([
    prisma.movie.count({
      where: mergeMovieWhere(scopedWhere, archiveGoldTierWhere),
    }),
    prisma.movie.count({
      where: mergeMovieWhere(scopedWhere, {
        releases: {
          some: { videoTrack: { hdr: { in: ["HDR10", "HDR10+"] } } },
        },
      }),
    }),
    prisma.movie.count({
      where: mergeMovieWhere(scopedWhere, russianAtmosAudioWhere),
    }),
    prisma.movie.count({
      where: mergeMovieWhere(scopedWhere, archiveEliteTierWhere),
    }),
  ]);

  return { gold, hdr10, russianAtmos, elite };
}

export async function getArchiveMetrics(): Promise<ArchiveMetrics> {
  return countArchiveMetrics();
}

export async function getArchiveTotals(): Promise<ArchiveTotals> {
  const movies = await prisma.movie.findMany({
    where: catalogWhere,
    select: releaseAggregateSortSelect,
  });

  let durationSeconds = 0;
  let fileSizeBytes = 0;

  for (const movie of movies) {
    const duration = movieDurationSortKey(movie.releases);
    if (duration != null) durationSeconds += duration;
    const size = movieFileSizeSortKey(movie.releases);
    if (size != null) fileSizeBytes += size;
  }

  return { durationSeconds, fileSizeBytes };
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
