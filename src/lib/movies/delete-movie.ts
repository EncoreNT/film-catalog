import { prisma } from "@/lib/db/prisma";

export async function deleteMovie(movieId: number) {
  await prisma.movie.delete({ where: { id: movieId } });
}
