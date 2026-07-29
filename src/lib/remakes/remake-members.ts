import type { Prisma } from "@/generated/prisma/client";
import type { remakeMemberInputSchema } from "@/lib/api/validators";
import type { z } from "zod";

type Db = Prisma.TransactionClient;

export type RemakeMemberInput = z.infer<typeof remakeMemberInputSchema>;

export async function syncRemakeMembers(
  db: Db,
  groupId: number,
  members: RemakeMemberInput[],
) {
  await db.remakeMember.deleteMany({ where: { groupId } });

  if (members.length === 0) return;

  await db.remakeMember.createMany({
    data: members.map((member) => ({
      groupId,
      movieId: member.movieId,
      role: member.role,
    })),
  });
}
