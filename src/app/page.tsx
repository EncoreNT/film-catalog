import { Suspense } from "react";
import { unstable_cache } from "next/cache";
import { prisma } from "@/lib/prisma";
import {
  buildMovieOrder,
  buildMovieWhere,
  parseListQuery,
} from "@/lib/movie-query";
import { movieInclude } from "@/lib/movie-include";
import {
  getArchiveMetrics,
  getStatusCounts,
} from "@/lib/archive-metrics";
import {
  getCatalogFacets,
  getCatalogGenreFacets,
} from "@/lib/catalog-facets";
import { MovieCatalog } from "@/components/MovieCatalog";

const getCachedArchiveMetrics = unstable_cache(
  getArchiveMetrics,
  ["archive-metrics"],
  { revalidate: 60 },
);

const getCachedCatalogFacets = unstable_cache(
  getCatalogFacets,
  ["catalog-facets"],
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
  const where = buildMovieWhere(query);
  const orderBy = buildMovieOrder(query);
  const page = query.page ?? 1;
  const limit = query.limit ?? 48;
  const skip = (page - 1) * limit;

  const [
    movies,
    total,
    { totalCount, catalogCount, draftCount },
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
    getCachedCatalogFacets(),
    getCachedCatalogGenreFacets(),
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
      archiveMetrics={archiveMetrics}
    />
  );
}

export default async function Home({ searchParams }: HomeProps) {
  const resolved = await searchParams;

  return (
    <Suspense
      fallback={
        <div className="grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-4">
          {Array.from({ length: 12 }).map((_, i) => (
            <div
              key={i}
              className="aspect-[2/3] animate-pulse rounded-[var(--radius)] bg-bg-surface"
            />
          ))}
        </div>
      }
    >
      <CatalogContent searchParams={resolved} />
    </Suspense>
  );
}
