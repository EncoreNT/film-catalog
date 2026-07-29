import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/db/prisma";
import { resolveEntitySlug } from "@/lib/shared/slug";

type DbClient = Prisma.TransactionClient | typeof prisma;

export async function resolveRemakeGroupSlug(
  db: DbClient,
  name: string,
  excludeId?: number,
): Promise<string> {
  return resolveEntitySlug(db, { table: "remakeGroup", text: name, excludeId });
}
