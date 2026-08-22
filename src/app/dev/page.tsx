import { prisma } from "@/lib/db/prisma";
import { PageHeader } from "@/components/primitives/PageHeader";
import { BackLink } from "@/components/primitives/BackLink";
import { Hdr10PlusRescanPanel } from "@/components/dev/Hdr10PlusRescanPanel";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "HDR10+",
};

export default async function DevPage() {
  const [hdrCount, plusCount] = await Promise.all([
    prisma.videoTrack.count({
      where: { hdr: { not: "SDR" } },
    }),
    prisma.videoTrack.count({
      where: { OR: [{ hasHdr10Plus: true }, { hdr: "HDR10+" }] },
    }),
  ]);

  return (
    <div className="space-y-8">
      <BackLink href="/settings">К настройкам</BackLink>
      <PageHeader
        eyebrow="инструменты"
        title="HDR10+"
        subtitle={`Перепрогон уже сканированных HDR-релизов. Сейчас HDR: ${hdrCount}, с меткой HDR10+: ${plusCount}.`}
      />
      <Hdr10PlusRescanPanel />
    </div>
  );
}
