import { prisma } from "@/lib/db/prisma";

export async function listFranchiseSlots(franchiseId: number) {
  return prisma.franchiseSlot.findMany({
    where: { franchiseId },
    orderBy: { storyOrder: "asc" },
    select: {
      id: true,
      storyOrder: true,
      movieId: true,
      titleHint: true,
      yearHint: true,
      isAnnounced: true,
      movie: { select: { id: true, title: true, year: true, slug: true } },
    },
  });
}
