import { prisma } from "@/lib/prisma";
import { getScanRoot } from "@/lib/settings";
import { movieInclude } from "@/lib/movie-include";
import { MovieStatus } from "@/generated/prisma/client";
import { ScanPageClient } from "./ScanPageClient";

export default async function ScanPage() {
  const [scanRoot, catalogCount, draftCount, drafts] = await Promise.all([
    getScanRoot(),
    prisma.movie.count({ where: { status: MovieStatus.CATALOG } }),
    prisma.movie.count({ where: { status: MovieStatus.DRAFT } }),
    prisma.movie.findMany({
      where: { status: MovieStatus.DRAFT },
      take: 24,
      include: movieInclude,
      orderBy: { createdAt: "desc" },
    }),
  ]);

  return (
    <ScanPageClient
      initialScanRoot={scanRoot ?? ""}
      initialStats={{ catalog: catalogCount, draft: draftCount }}
      initialDrafts={drafts}
    />
  );
}
