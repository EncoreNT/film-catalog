import type { Prisma } from "@/generated/prisma/client";

export const movieInclude = {
  videoTrack: true,
  audioTracks: true,
  subtitleTracks: true,
  storage: true,
  genres: { orderBy: { name: "asc" } },
} satisfies Prisma.MovieInclude;

export type MovieWithRelations = Prisma.MovieGetPayload<{
  include: typeof movieInclude;
}>;
