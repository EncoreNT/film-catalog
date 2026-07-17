import { prisma } from "@/lib/db/prisma";
import { buildInclude } from "@/lib/builds/build-queue";
import { serializeBuild } from "@/lib/builds/build-serialize";
import { sortBuildsForQueue } from "@/lib/builds/build-queue-display";
import { BuildsPageClient } from "@/components/builds/BuildsPageClient";

interface PageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function BuildsPage({ searchParams }: PageProps) {
  const resolved = await searchParams;
  const movieIdRaw = resolved.movieId;
  const movieId =
    typeof movieIdRaw === "string" ? Number(movieIdRaw) : undefined;

  const items = await prisma.releaseBuild.findMany({
    where: movieId ? { movieId } : undefined,
    include: buildInclude,
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  const serialized = sortBuildsForQueue(items.map(serializeBuild));

  return (
    <div className="container-wide space-y-8 py-8 sm:py-10">
      <header className="max-w-2xl">
        <h1 className="font-display text-3xl font-semibold tracking-tight text-text sm:text-4xl">
          Сборки
        </h1>
      </header>
      <BuildsPageClient initialItems={serialized} movieId={movieId} />
    </div>
  );
}
