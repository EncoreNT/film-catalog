import { prisma } from "@/lib/db/prisma";
import { franchiseCreateSchema } from "@/lib/api/validators";
import { franchiseInclude } from "@/lib/franchises/franchise-include";
import { resolveFranchiseSlug } from "@/lib/franchises/franchise-slug";
import { syncFranchiseSlots } from "@/lib/franchises/franchise-slots";
import type { z } from "zod";

type FranchiseCreateInput = z.infer<typeof franchiseCreateSchema>;

export async function createFranchise(data: FranchiseCreateInput) {
  const { slots, ...franchiseData } = data;
  const slug = await resolveFranchiseSlug(prisma, data.name);

  return prisma.$transaction(async (tx) => {
    const created = await tx.franchise.create({
      data: {
        slug,
        name: franchiseData.name,
        description: franchiseData.description ?? null,
        coverPath: franchiseData.coverPath ?? null,
      },
    });

    if (slots?.length) {
      await syncFranchiseSlots(tx, created.id, slots);
    }

    return tx.franchise.findUnique({
      where: { id: created.id },
      include: franchiseInclude,
    });
  });
}
