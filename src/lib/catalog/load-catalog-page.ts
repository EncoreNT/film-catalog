import { unstable_cache } from "next/cache";
import { parseListQuery, DEFAULT_MOVIE_LIST_LIMIT } from "@/lib/movies/movie-query";
import { fetchMovieList } from "@/lib/movies/fetch-movie-list";
import {
  getArchiveMetrics,
  getArchiveTotals,
  getStatusCounts,
} from "@/lib/catalog/archive-metrics";
import {
  getCatalogFacets,
  getCatalogGenreFacets,
} from "@/lib/catalog/catalog-facets";
import { prisma } from "@/lib/db/prisma";
import { MovieStatus } from "@/generated/prisma/client";
import { getCatalogRemakeBadges } from "@/lib/remakes/remake-catalog-badges";
import {
  getCatalogDefaultSort,
  getCatalogPageSize,
} from "@/lib/db/settings";

const getCachedArchiveMetrics = unstable_cache(
  getArchiveMetrics,
  ["archive-metrics"],
  { revalidate: 60 },
);

const getCachedArchiveTotals = unstable_cache(
  getArchiveTotals,
  ["archive-totals"],
  { revalidate: 60 },
);

const getCachedCatalogFacets = unstable_cache(
  getCatalogFacets,
  ["catalog-facets-v2"],
  { revalidate: 60 },
);

const getCachedCatalogGenreFacets = unstable_cache(
  getCatalogGenreFacets,
  ["catalog-genre-facets"],
  { revalidate: 60 },
);

export async function loadCatalogPage(
  searchParams: Record<string, string | string[] | undefined>,
) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(searchParams)) {
    if (typeof value === "string") params.set(key, value);
  }

  if (!params.has("limit")) {
    params.set("limit", String(await getCatalogPageSize()));
  }
  if (!params.has("sort")) {
    params.set("sort", await getCatalogDefaultSort());
  }

  const query = parseListQuery(params);
  const page = query.page ?? 1;
  const limit = query.limit ?? DEFAULT_MOVIE_LIST_LIMIT;

  const statuses = (query.status ?? "CATALOG")
    .split(",")
    .filter(Boolean) as MovieStatus[];

  const [
    { items: movies, total, releaseCount },
    { totalCount, catalogCount, draftCount, excludedCount },
    archiveMetrics,
    archiveTotals,
    facets,
    genreFacets,
    emptyReleaseCount,
  ] = await Promise.all([
    fetchMovieList(query),
    getStatusCounts(),
    getCachedArchiveMetrics(),
    getCachedArchiveTotals(),
    getCachedCatalogFacets(statuses),
    getCachedCatalogGenreFacets(statuses),
    prisma.movie.count({
      where: {
        status: statuses.length === 1 ? statuses[0] : { in: statuses },
        releases: { none: {} },
      },
    }),
  ]);

  const remakeBadges = await getCatalogRemakeBadges(movies.map((m) => m.id));
  const remakeBadgeRecord = Object.fromEntries(remakeBadges);

  return {
    movies,
    total,
    releaseCount,
    totalCount,
    page,
    limit,
    remakeBadges: remakeBadgeRecord,
    facets: {
      ...facets,
      genres: genreFacets,
    },
    catalogCount,
    draftCount,
    excludedCount,
    emptyReleaseCount,
    archiveMetrics,
    archiveTotals,
  };
}
