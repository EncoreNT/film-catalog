import type { Prisma } from "@/generated/prisma/client";
import type { franchiseSlotInputSchema } from "@/lib/api/validators";
import type { z } from "zod";

type Db = Prisma.TransactionClient;

export type FranchiseSlotInput = z.infer<typeof franchiseSlotInputSchema>;

export async function syncFranchiseSlots(
  db: Db,
  franchiseId: number,
  slots: FranchiseSlotInput[],
) {
  await db.franchiseSlot.deleteMany({ where: { franchiseId } });

  if (slots.length === 0) return;

  await db.franchiseSlot.createMany({
    data: slots.map((slot) => ({
      franchiseId,
      movieId: slot.movieId ?? null,
      storyOrder: slot.storyOrder,
      titleHint: slot.titleHint ?? null,
      yearHint: slot.yearHint ?? null,
    })),
  });
}
