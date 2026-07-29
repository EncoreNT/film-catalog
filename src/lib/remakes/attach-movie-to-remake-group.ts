import type { PrismaClient } from "@/generated/prisma/client";
import { prisma } from "@/lib/db/prisma";
import { resolveRemakeGroupSlug } from "@/lib/remakes/remake-slug";
import { getMovieRemakeMemberships } from "@/lib/remakes/remake-membership";
import type { remakeAttachSchema } from "@/lib/api/validators";
import type { z } from "zod";

type AttachInput = z.infer<typeof remakeAttachSchema>;
type RemakeDb = Pick<
  PrismaClient,
  "remakeGroup" | "remakeMember" | "$transaction"
>;

export async function attachMovieToRemakeGroup(
  movieId: number,
  input: AttachInput,
  db: RemakeDb = prisma,
) {
  const name = input.name?.trim() ?? "";
  const groupId = input.groupId ?? null;
  const role = input.role;

  return db.$transaction(async (tx) => {
    let targetGroupId: number;

    if (name) {
      const slug = await resolveRemakeGroupSlug(tx, name);
      const created = await tx.remakeGroup.create({
        data: { slug, name },
      });
      targetGroupId = created.id;
    } else {
      targetGroupId = groupId as number;
      const existing = await tx.remakeGroup.findUnique({
        where: { id: targetGroupId },
        select: { id: true },
      });
      if (!existing) throw new Error("Группа ремейков не найдена");
    }

    await tx.remakeMember.upsert({
      where: {
        groupId_movieId: { groupId: targetGroupId, movieId },
      },
      create: { groupId: targetGroupId, movieId, role },
      update: { role },
    });

    return getMovieRemakeMemberships(tx, movieId);
  });
}

export async function updateMovieRemakeRole(
  movieId: number,
  groupId: number,
  role: AttachInput["role"],
  db: RemakeDb = prisma,
) {
  return db.$transaction(async (tx) => {
    const membership = await tx.remakeMember.findUnique({
      where: { groupId_movieId: { groupId, movieId } },
    });
    if (!membership) throw new Error("Фильм не состоит в этой группе");

    await tx.remakeMember.update({
      where: { id: membership.id },
      data: { role },
    });

    return getMovieRemakeMemberships(tx, movieId);
  });
}

export async function detachMovieFromRemakeGroup(
  movieId: number,
  groupId: number,
  db: RemakeDb = prisma,
) {
  return db.$transaction(async (tx) => {
    await tx.remakeMember.deleteMany({
      where: { groupId, movieId },
    });

    const count = await tx.remakeMember.count({ where: { groupId } });
    if (count === 0) {
      await tx.remakeGroup.delete({ where: { id: groupId } });
    }

    return getMovieRemakeMemberships(tx, movieId);
  });
}
