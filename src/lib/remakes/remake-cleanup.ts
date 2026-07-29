import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/db/prisma";

type DbClient = Prisma.TransactionClient | typeof prisma;

/** Deletes the group when it has no members left. */
export async function cleanupEmptyRemakeGroup(
  db: DbClient,
  groupId: number,
): Promise<void> {
  const count = await db.remakeMember.count({ where: { groupId } });
  if (count === 0) {
    await db.remakeGroup.delete({ where: { id: groupId } });
  }
}
