import type { PrismaClient } from "@/generated/prisma/client";
import { saveEntityCoverBuffer } from "@/lib/covers/cover-storage";

type FranchiseDb = Pick<PrismaClient, "franchise">;

export async function saveFranchiseCover(
  db: FranchiseDb,
  franchiseId: number,
  buffer: Buffer,
  ext: string,
) {
  const relativeCoverPath = await saveEntityCoverBuffer(
    `franchise-${franchiseId}`,
    buffer,
    ext,
  );
  const updated = await db.franchise.update({
    where: { id: franchiseId },
    data: { coverPath: relativeCoverPath },
    select: { id: true, slug: true, coverPath: true, updatedAt: true },
  });

  return updated;
}
