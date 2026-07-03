import "dotenv/config";
import { recomputeAllMatchKeys } from "../src/lib/movies/movie-match-key";

async function main() {
  const { total, updated } = await recomputeAllMatchKeys();
  console.log(`matchKey backfill: ${updated}/${total} movies updated`);
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
