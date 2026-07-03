import { Suspense } from "react";
import { unstable_cache } from "next/cache";
import { prisma } from "@/lib/db/prisma";
import {
  buildMovieListWhere,
  buildMovieOrder,
  parseListQuery,
} from "@/lib/movies/movie-query";
import { movieInclude } from "@/lib/movies/movie-include";
import {
  getArchiveMetrics,
  getStatusCounts,
} from "@/lib/catalog/archive-metrics";
import {
  getCatalogFacets,
  getCatalogGenreFacets,
} from "@/lib/catalog/catalog-facets";
import { MovieCatalog } from "@/components/catalog/MovieCatalog";
import { CatalogSkeleton } from "@/components/catalog/CatalogSkeleton";
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

interface HomeProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

async function CatalogContent({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(searchParams)) {
    if (typeof value === "string") params.set(key, value);
  }

  const query = parseListQuery(params);
  const where = await buildMovieListWhere(query);
  const orderBy = buildMovieOrder(query);
  const page = query.page ?? 1;
  const limit = query.limit ?? 48;
  const skip = (page - 1) * limit;

  const statuses = (query.status ?? "CATALOG")
    .split(",")
    .filter(Boolean) as MovieStatus[];

  const [
    movies,
    total,
    { totalCount, catalogCount, draftCount, excludedCount },
    archiveMetrics,
    facets,
    genreFacets,
  ] = await Promise.all([
    prisma.movie.findMany({
      where,
      orderBy,
      skip,
      take: limit,
      include: movieInclude,
    }),
    prisma.movie.count({ where }),
    getStatusCounts(),
    getCachedArchiveMetrics(),
    getCachedCatalogFacets(statuses),
    getCachedCatalogGenreFacets(statuses),
  ]);

  return (
    <MovieCatalog
      movies={movies}
      total={total}
      totalCount={totalCount}
      page={page}
      limit={limit}
      facets={{
        ...facets,
        genres: genreFacets,
      }}
      catalogCount={catalogCount}
      draftCount={draftCount}
      excludedCount={excludedCount}
      archiveMetrics={archiveMetrics}
    />
  );
}

export default async function Home({ searchParams }: HomeProps) {
  const resolved = await searchParams;

  return (
    <Suspense fallback={<CatalogSkeleton />}>
      <CatalogContent searchParams={resolved} />
    </Suspense>
  );
}
