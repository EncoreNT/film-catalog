import "dotenv/config";
import { recomputeAllMovieSlugs } from "../src/lib/movies/movie-slug";

async function main() {
  const { total, updated } = await recomputeAllMovieSlugs();
  console.log(`slug backfill: ${updated}/${total} movies updated`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    const { prisma } = await import("../src/lib/db/prisma");
    await prisma.$disconnect();
  });
