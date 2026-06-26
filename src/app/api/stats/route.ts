import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { MovieStatus } from "@/generated/prisma/client";
import { getCatalogFacets } from "@/lib/catalog-facets";

export async function GET() {
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
    prisma.movie.count({ where: { coverPath: null, status: MovieStatus.CATALOG } }),
    prisma.movie.count({ where: { watchedAt: { not: null } } }),
    prisma.movie.aggregate({ _avg: { rating: true }, where: { rating: { not: null } } }),
    getCatalogFacets(),
  ]);

  return NextResponse.json({
    total,
    catalog,
    draft,
    excluded,
    withoutCover,
    watched,
    avgRating: avgRating._avg.rating,
    facets,
  });
}
