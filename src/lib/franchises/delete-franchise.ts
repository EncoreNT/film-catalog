import { withCoverMutation } from "@/lib/covers/cover-mutation";
import { prisma } from "@/lib/db/prisma";
import { cleanupUnreferencedCovers } from "@/lib/covers/cleanup-covers";

export async function deleteFranchise(franchiseId: number) {
  return withCoverMutation(async () => {
    const franchise = await prisma.franchise.delete({ where: { id: franchiseId } });
    await cleanupUnreferencedCovers([franchise.coverPath]);
  });
}
