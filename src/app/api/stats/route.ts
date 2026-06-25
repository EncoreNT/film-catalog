import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { MovieStatus } from "@/generated/prisma/client";

export async function GET() {
  const [
    total,
    catalog,
    draft,
    excluded,
    withoutCover,
    watched,
    avgRating,
    resolutions,
    audioLanguages,
    subtitleLanguages,
    channelLayouts,
  ] = await Promise.all([
    prisma.movie.count(),
    prisma.movie.count({ where: { status: MovieStatus.CATALOG } }),
    prisma.movie.count({ where: { status: MovieStatus.DRAFT } }),
    prisma.movie.count({ where: { status: MovieStatus.EXCLUDED } }),
    prisma.movie.count({ where: { coverPath: null, status: MovieStatus.CATALOG } }),
    prisma.movie.count({ where: { watchedAt: { not: null } } }),
    prisma.movie.aggregate({ _avg: { rating: true }, where: { rating: { not: null } } }),
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

  return NextResponse.json({
    total,
    catalog,
    draft,
    excluded,
    withoutCover,
    watched,
    avgRating: avgRating._avg.rating,
    facets: {
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
    },
  });
}
