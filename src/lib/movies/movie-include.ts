import type { Prisma } from "@/generated/prisma/client";

export const releaseInclude = {
  videoTrack: true,
  audioTracks: true,
  subtitleTracks: true,
  externalStorage: true,
} satisfies Prisma.ReleaseInclude;

export const movieInclude = {
  releases: {
    include: releaseInclude,
    orderBy: { createdAt: "asc" as const },
  },
  movieGenres: {
    orderBy: { sortOrder: "asc" as const },
    include: { genre: true },
  },
  movieRatings: {
    include: { rater: true },
    orderBy: { rater: { sortOrder: "asc" as const } },
  },
} satisfies Prisma.MovieInclude;

export const movieDetailInclude = {
  ...movieInclude,
  parts: {
    orderBy: { partNumber: "asc" as const },
    include: {
      releases: {
        include: releaseInclude,
        orderBy: { createdAt: "asc" as const },
      },
    },
  },
} satisfies Prisma.MovieInclude;

export type ReleaseWithTracks = Prisma.ReleaseGetPayload<{
  include: typeof releaseInclude;
}>;

export type MovieWithTracks = Prisma.MovieGetPayload<{
  include: typeof movieInclude;
}>;

export type MovieWithTracksAndParts = Prisma.MovieGetPayload<{
  include: typeof movieDetailInclude;
}>;
