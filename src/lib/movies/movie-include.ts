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
} satisfies Prisma.MovieInclude;

export type ReleaseWithTracks = Prisma.ReleaseGetPayload<{
  include: typeof releaseInclude;
}>;

export type MovieWithTracks = Prisma.MovieGetPayload<{
  include: typeof movieInclude;
}>;
