import { prisma } from "@/lib/db/prisma";

export async function deleteRemakeGroup(groupId: number) {
  await prisma.remakeGroup.delete({ where: { id: groupId } });
}
