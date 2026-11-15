import { withCoverMutation } from "@/lib/covers/cover-mutation";
import { prisma } from "@/lib/db/prisma";
import { cleanupUnreferencedCovers } from "@/lib/covers/cleanup-covers";

export async function deleteMovie(movieId: number) {
  return withCoverMutation(async () => {
    const movie = await prisma.movie.delete({ where: { id: movieId } });
    await cleanupUnreferencedCovers([movie.coverPath]);
  });
}
