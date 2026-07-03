import { prisma } from "@/lib/db/prisma";
import { movieInclude } from "@/lib/movies/movie-include";
import { MovieStatus } from "@/generated/prisma/client";

export async function getDraftQueueStats() {
  const [catalog, draft] = await Promise.all([
    prisma.movie.count({ where: { status: MovieStatus.CATALOG } }),
    prisma.movie.count({ where: { status: MovieStatus.DRAFT } }),
  ]);
  return { catalog, draft };
}

export async function getRecentDrafts(limit = 24) {
  return prisma.movie.findMany({
    where: { status: MovieStatus.DRAFT },
    take: limit,
    include: movieInclude,
    orderBy: { createdAt: "desc" },
  });
}
