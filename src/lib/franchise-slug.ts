import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { slugifyTitle } from "@/lib/slug";

type DbClient = Prisma.TransactionClient | typeof prisma;

export async function resolveFranchiseSlug(
  db: DbClient,
  name: string,
  excludeId?: number,
): Promise<string> {
  const base = slugifyTitle(name);
  let candidate = base;
  let suffix = 2;

  while (true) {
    const existing = await db.franchise.findFirst({
      where: {
        slug: candidate,
        ...(excludeId != null ? { NOT: { id: excludeId } } : {}),
      },
      select: { id: true },
    });

    if (!existing) return candidate;

    candidate = `${base}-${suffix}`;
    suffix += 1;
  }
}
