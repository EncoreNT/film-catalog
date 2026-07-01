import type { Prisma } from "@/generated/prisma/client";

export const movieInclude = {
  videoTrack: true,
  audioTracks: true,
  subtitleTracks: true,
  storage: true,
  movieGenres: {
    orderBy: { sortOrder: "asc" },
    include: { genre: true },
  },
} satisfies Prisma.MovieInclude;
