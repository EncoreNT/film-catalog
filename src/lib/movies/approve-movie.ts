import { prisma } from "@/lib/db/prisma";
import { MovieStatus } from "@/generated/prisma/client";
import { movieInclude } from "@/lib/movies/movie-include";

/** Promote a DRAFT movie to CATALOG and return the full record for API/UI. */
export async function approveMovie(movieId: number) {
  return prisma.movie.update({
    where: { id: movieId },
    data: { status: MovieStatus.CATALOG },
    include: movieInclude,
  });
}
