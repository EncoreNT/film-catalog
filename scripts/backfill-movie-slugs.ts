import "dotenv/config";
import { prisma } from "../src/lib/prisma";
import { resolveMovieSlug } from "../src/lib/movie-slug";

async function main() {
  const movies = await prisma.movie.findMany({
    select: { id: true, title: true },
    orderBy: { id: "asc" },
  });

  for (const movie of movies) {
    const slug = await resolveMovieSlug(prisma, movie.title, movie.id);
    await prisma.movie.update({
      where: { id: movie.id },
      data: { slug },
    });
  }

  console.log(`Backfilled slugs for ${movies.length} movies`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
