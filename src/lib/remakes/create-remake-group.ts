import { prisma } from "@/lib/db/prisma";
import { remakeGroupCreateSchema } from "@/lib/api/validators";
import { remakeGroupInclude } from "@/lib/remakes/remake-include";
import { resolveRemakeGroupSlug } from "@/lib/remakes/remake-slug";
import { syncRemakeMembers } from "@/lib/remakes/remake-members";
import type { z } from "zod";

type RemakeGroupCreateInput = z.infer<typeof remakeGroupCreateSchema>;

export async function createRemakeGroup(data: RemakeGroupCreateInput) {
  const { members, ...groupData } = data;
  const slug = await resolveRemakeGroupSlug(prisma, data.name);

  return prisma.$transaction(async (tx) => {
    const created = await tx.remakeGroup.create({
      data: {
        slug,
        name: groupData.name,
        description: groupData.description ?? null,
      },
    });

    if (members?.length) {
      await syncRemakeMembers(tx, created.id, members);
    }

    return tx.remakeGroup.findUnique({
      where: { id: created.id },
      include: remakeGroupInclude,
    });
  });
}
