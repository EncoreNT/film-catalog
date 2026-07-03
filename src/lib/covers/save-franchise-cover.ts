import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { revalidatePath } from "next/cache";
import type { PrismaClient } from "@/generated/prisma/client";
import { dataPath } from "@/lib/db/data-path";
import { assertCoverImageExtension } from "@/lib/covers/cover-formats-mkv";

const COVERS_DIR = dataPath("covers");

type FranchiseDb = Pick<PrismaClient, "franchise">;

export async function saveFranchiseCover(
  db: FranchiseDb,
  franchiseId: number,
  buffer: Buffer,
  ext: string,
) {
  assertCoverImageExtension(ext);
  await mkdir(COVERS_DIR, { recursive: true });
  const coverFileName = `franchise-${franchiseId}${ext}`;
  const coverPath = path.join(COVERS_DIR, coverFileName);
  await writeFile(coverPath, buffer);
  const relativeCoverPath = `covers/${coverFileName}`;
  const updated = await db.franchise.update({
    where: { id: franchiseId },
    data: { coverPath: relativeCoverPath },
    select: { id: true, slug: true, coverPath: true, updatedAt: true },
  });

  revalidatePath("/franchises");
  revalidatePath(`/franchises/${updated.slug}`);
  revalidatePath(`/franchises/${updated.slug}/edit`);

  return updated;
}
