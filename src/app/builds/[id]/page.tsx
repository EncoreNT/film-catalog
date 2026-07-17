import { notFound } from "next/navigation";
import { prisma } from "@/lib/db/prisma";
import { buildInclude } from "@/lib/builds/build-queue";
import { serializeBuild } from "@/lib/builds/build-serialize";
import { sortBuildsForQueue } from "@/lib/builds/build-queue-display";
import { BuildJobDetailClient } from "@/components/builds/BuildJobDetailClient";
import { BackLink } from "@/components/primitives/BackLink";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function BuildDetailPage({ params }: PageProps) {
  const { id } = await params;
  const buildId = Number(id);
  if (!Number.isInteger(buildId) || buildId <= 0) notFound();

  const build = await prisma.releaseBuild.findUnique({
    where: { id: buildId },
    include: buildInclude,
  });
  if (!build) notFound();

  const activeQueue = await prisma.releaseBuild.findMany({
    where: { status: { in: ["QUEUED", "RUNNING"] } },
    include: buildInclude,
  });

  return (
    <div className="flex flex-col gap-6 py-6 sm:py-8 lg:-mb-10 lg:h-[calc(100dvh-10.25rem)] lg:min-h-0 lg:overflow-hidden lg:gap-8">
      <div className="shrink-0">
        <BackLink href="/builds">К очереди сборок</BackLink>
      </div>
      <BuildJobDetailClient
        initialBuild={serializeBuild(build)}
        initialQueueItems={sortBuildsForQueue(activeQueue.map(serializeBuild))}
      />
    </div>
  );
}
