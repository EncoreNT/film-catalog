import { prisma } from "@/lib/db/prisma";
import { posterMetadataForPath, posterMetadataStore } from "./poster-metadata";
import { posterQuality, type PosterQualityReport } from "./poster-quality";

export async function getPosterQualityReport(force = false): Promise<PosterQualityReport> {
  const [movies, index] = await Promise.all([
    prisma.movie.findMany({
      select: { id: true, slug: true, title: true, year: true, status: true,
        coverPath: true, updatedAt: true },
      orderBy: { title: "asc" },
    }),
    posterMetadataStore.refresh(force),
  ]);
  return {
    checkedAt: new Date().toISOString(),
    movies: movies.map(({ coverPath, updatedAt, ...movie }) => {
      const metadata = posterMetadataForPath(index.files, coverPath);
      return { ...movie, coverVersion: updatedAt.toISOString(), metadata,
        quality: posterQuality(metadata) };
    }),
  };
}
