import { notFound } from "next/navigation";
import { prisma } from "@/lib/db/prisma";
import { buildInclude } from "@/lib/builds/build-queue";
import { serializeBuild } from "@/lib/builds/build-serialize";
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

  return (
    <div className="container-wide space-y-6 py-8">
      <BackLink href="/builds">К очереди сборок</BackLink>
      <BuildJobDetailClient initialBuild={serializeBuild(build)} />
    </div>
  );
}
