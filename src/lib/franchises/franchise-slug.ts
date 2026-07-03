import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/db/prisma";
import { resolveEntitySlug } from "@/lib/shared/slug";

type DbClient = Prisma.TransactionClient | typeof prisma;

export async function resolveFranchiseSlug(
  db: DbClient,
  name: string,
  excludeId?: number,
): Promise<string> {
  return resolveEntitySlug(db, { table: "franchise", text: name, excludeId });
}
