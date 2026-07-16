import { prisma } from "@/lib/db/prisma";
import { buildInclude } from "@/lib/builds/build-queue";
import { serializeBuild } from "@/lib/builds/build-serialize";
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

  return (
    <div className="container-wide space-y-6 py-8">
      <div>
        <p className="font-mono-tech text-[11px] uppercase text-faint">очередь</p>
        <h1 className="font-display text-3xl font-semibold text-text">Сборки</h1>
        <p className="mt-2 text-sm text-muted">
          Фоновые задачи по сборке пользовательских MKV-релизов.
        </p>
      </div>
      <BuildsPageClient
        initialItems={items.map(serializeBuild)}
        movieId={movieId}
      />
    </div>
  );
}
