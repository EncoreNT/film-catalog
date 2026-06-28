import { prisma } from "./prisma";
import { dictLabel, RELEASE_TYPES } from "./dictionaries";

export type AlternativeQualityMovie = {
  id: number;
  slug: string;
  title: string;
  releaseType: string | null;
  videoTrack: { resolutionLabel: string | null } | null;
};

export async function findAlternativeQualityMovies(movie: {
  id: number;
  title: string;
  year: number | null;
}): Promise<AlternativeQualityMovie[]> {
  return prisma.movie.findMany({
    where: {
      id: { not: movie.id },
      title: movie.title,
      year: movie.year,
      status: { not: "EXCLUDED" },
    },
    select: {
      id: true,
      slug: true,
      title: true,
      releaseType: true,
      videoTrack: { select: { resolutionLabel: true } },
    },
    orderBy: [{ releaseType: "asc" }, { id: "asc" }],
  });
}

export function alternativeQualityLabel(movie: AlternativeQualityMovie): string {
  const parts: string[] = [];
  if (movie.releaseType) {
    parts.push(dictLabel(RELEASE_TYPES, movie.releaseType) ?? movie.releaseType);
  }
  const resolution = movie.videoTrack?.resolutionLabel;
  if (resolution && resolution !== "other") {
    parts.push(resolution === "4K" ? "4K" : resolution);
  }
  return parts.length > 0 ? parts.join(" · ") : "другая версия";
}
