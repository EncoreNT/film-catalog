import { prisma } from "@/lib/db/prisma";

export async function deleteFranchise(franchiseId: number) {
  await prisma.franchise.delete({ where: { id: franchiseId } });
}
