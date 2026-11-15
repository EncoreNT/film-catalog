import { withCoverMutation } from "@/lib/covers/cover-mutation";
import { cleanupUnreferencedCovers } from "@/lib/covers/cleanup-covers";
import { prisma } from "@/lib/db/prisma";
import { franchiseUpdateSchema } from "@/lib/api/validators";
import { franchiseInclude } from "@/lib/franchises/franchise-include";
import { resolveFranchiseSlug } from "@/lib/franchises/franchise-slug";
import { syncFranchiseSlots } from "@/lib/franchises/franchise-slots";
import type { z } from "zod";

type FranchiseUpdateInput = z.infer<typeof franchiseUpdateSchema>;

export async function updateFranchise(
  franchiseId: number,
  data: FranchiseUpdateInput,
) {
  return withCoverMutation(async () => {
    const { slots, ...franchiseData } = data;

    const result = await prisma.$transaction(async (tx) => {
      const previous = await tx.franchise.findUniqueOrThrow({ where: { id: franchiseId }, select: { coverPath: true } });
      const slug =
        franchiseData.name !== undefined
          ? await resolveFranchiseSlug(tx, franchiseData.name, franchiseId)
          : undefined;

      await tx.franchise.update({
        where: { id: franchiseId },
        data: {
          ...franchiseData,
          slug,
          description:
            franchiseData.description === undefined
              ? undefined
              : franchiseData.description,
          coverPath:
            franchiseData.coverPath === undefined
              ? undefined
              : franchiseData.coverPath,
        },
      });

      if (slots !== undefined) {
        await syncFranchiseSlots(tx, franchiseId, slots);
      }

      const updated = await tx.franchise.findUnique({
        where: { id: franchiseId },
        include: franchiseInclude,
      });
      return { updated, previousCover: previous.coverPath };
    });
    await cleanupUnreferencedCovers([result.previousCover]);
    return result.updated;
  });
}
