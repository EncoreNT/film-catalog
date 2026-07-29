import { prisma } from "@/lib/db/prisma";
import { remakeGroupUpdateSchema } from "@/lib/api/validators";
import { remakeGroupInclude } from "@/lib/remakes/remake-include";
import { resolveRemakeGroupSlug } from "@/lib/remakes/remake-slug";
import { syncRemakeMembers } from "@/lib/remakes/remake-members";
import type { z } from "zod";

type RemakeGroupUpdateInput = z.infer<typeof remakeGroupUpdateSchema>;

export async function updateRemakeGroup(
  groupId: number,
  data: RemakeGroupUpdateInput,
) {
  const { members, ...groupData } = data;

  return prisma.$transaction(async (tx) => {
    const slug =
      groupData.name !== undefined
        ? await resolveRemakeGroupSlug(tx, groupData.name, groupId)
        : undefined;

    await tx.remakeGroup.update({
      where: { id: groupId },
      data: {
        ...groupData,
        slug,
        description:
          groupData.description === undefined
            ? undefined
            : groupData.description,
      },
    });

    if (members !== undefined) {
      await syncRemakeMembers(tx, groupId, members);
    }

    return tx.remakeGroup.findUnique({
      where: { id: groupId },
      include: remakeGroupInclude,
    });
  });
}
