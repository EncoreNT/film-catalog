import { unstable_cache } from "next/cache";
import { parseListQuery } from "@/lib/movies/movie-query";
import { fetchMovieList } from "@/lib/movies/fetch-movie-list";
import {
  getArchiveMetrics,
  getStatusCounts,
} from "@/lib/catalog/archive-metrics";
import {
  getCatalogFacets,
  getCatalogGenreFacets,
} from "@/lib/catalog/catalog-facets";
import { MovieStatus } from "@/generated/prisma/client";

const getCachedArchiveMetrics = unstable_cache(
  getArchiveMetrics,
  ["archive-metrics"],
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

  const query = parseListQuery(params);
  const page = query.page ?? 1;
  const limit = query.limit ?? 48;

  const statuses = (query.status ?? "CATALOG")
    .split(",")
    .filter(Boolean) as MovieStatus[];

  const [
    { items: movies, total },
    { totalCount, catalogCount, draftCount, excludedCount },
    archiveMetrics,
    facets,
    genreFacets,
  ] = await Promise.all([
    fetchMovieList(query),
    getStatusCounts(),
    getCachedArchiveMetrics(),
    getCachedCatalogFacets(statuses),
    getCachedCatalogGenreFacets(statuses),
  ]);

  return {
    movies,
    total,
    totalCount,
    page,
    limit,
    facets: {
      ...facets,
      genres: genreFacets,
    },
    catalogCount,
    draftCount,
    excludedCount,
    archiveMetrics,
  };
}
