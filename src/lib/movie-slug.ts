import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { slugifyTitle } from "@/lib/slug";

type DbClient = Prisma.TransactionClient | typeof prisma;

export async function resolveMovieSlug(
  db: DbClient,
  title: string,
  excludeId?: number,
): Promise<string> {
  const base = slugifyTitle(title);
  let candidate = base;
  let suffix = 2;

  while (true) {
    const existing = await db.movie.findFirst({
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
