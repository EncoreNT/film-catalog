import { Suspense } from "react";
import { prisma } from "@/lib/prisma";
import {
  buildMovieOrder,
  buildMovieWhere,
  parseListQuery,
} from "@/lib/movie-query";
import { movieInclude } from "@/lib/movie-include";
import { MovieCatalog } from "@/components/MovieCatalog";
import { MovieStatus } from "@/generated/prisma/client";

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
    totalCount,
    catalogCount,
    draftCount,
    resolutions,
    audioLanguages,
    subtitleLanguages,
    channelLayouts,
    genres,
  ] = await Promise.all([
    prisma.movie.findMany({
      where,
      orderBy,
      skip,
      take: limit,
      include: movieInclude,
    }),
    prisma.movie.count({ where }),
    prisma.movie.count(),
    prisma.movie.count({ where: { status: MovieStatus.CATALOG } }),
    prisma.movie.count({ where: { status: MovieStatus.DRAFT } }),
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
    prisma.genre.findMany({
      where: { movies: { some: { status: MovieStatus.CATALOG } } },
      select: { name: true, _count: { select: { movies: true } } },
      orderBy: { name: "asc" },
    }),
  ]);

  return (
    <MovieCatalog
      movies={movies}
      total={total}
      totalCount={totalCount}
      facets={{
        resolutions: resolutions.map((r) => ({
          value: r.resolutionLabel,
          count: r._count,
        })),
        audioLanguages: audioLanguages.map((r) => ({
          value: r.language,
          count: r._count,
        })),
        subtitleLanguages: subtitleLanguages.map((r) => ({
          value: r.language,
          count: r._count,
        })),
        channelLayouts: channelLayouts.map((r) => ({
          value: r.channelLayout,
          count: r._count,
        })),
        genres: genres.map((g) => ({
          value: g.name,
          count: g._count.movies,
        })),
      }}
      catalogCount={catalogCount}
      draftCount={draftCount}
    />
  );
}

export default async function Home({ searchParams }: HomeProps) {
  const resolved = await searchParams;

  return (
    <Suspense
      fallback={
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
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
