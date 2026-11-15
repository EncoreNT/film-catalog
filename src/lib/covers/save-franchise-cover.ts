import { withCoverMutation } from "@/lib/covers/cover-mutation";
import type { PrismaClient } from "@/generated/prisma/client";
import { saveEntityCoverBuffer } from "@/lib/covers/cover-storage";
import { cleanupUnreferencedCovers } from "./cleanup-covers";
import { COVER_IMAGE_EXTENSION_LIST } from "./cover-formats";

type FranchiseDb = Pick<PrismaClient, "franchise" | "movie">;

export async function saveFranchiseCover(
  db: FranchiseDb,
  franchiseId: number,
  buffer: Buffer,
  ext: string,
) {
  return withCoverMutation(async () => {
    const previous = await db.franchise.findUniqueOrThrow({ where: { id: franchiseId }, select: { coverPath: true } });
    const relativeCoverPath = await saveEntityCoverBuffer(
      `franchise-${franchiseId}`,
      buffer,
      ext,
    );
    let updated;
    try {
      updated = await db.franchise.update({
        where: { id: franchiseId },
        data: { coverPath: relativeCoverPath },
        select: { id: true, slug: true, coverPath: true, updatedAt: true },
      });
    } catch (error) {
      await cleanupUnreferencedCovers([relativeCoverPath], db);
      throw error;
    }
    await cleanupUnreferencedCovers([
      previous.coverPath,
      ...COVER_IMAGE_EXTENSION_LIST.filter((item) => item !== ext.toLowerCase())
        .map((item) => `covers/franchise-${franchiseId}${item}`),
    ], db);
    return updated;
  });
}
