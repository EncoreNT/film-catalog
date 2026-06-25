import { prisma } from "./prisma";

/**
 * Resolve genre names to their row ids, upserting any missing ones.
 * Names are normalized (trimmed + lowercased) so duplicates collapse.
 */
export async function upsertGenresByNames(
  names: string[],
): Promise<{ id: number; name: string }[]> {
  const unique = Array.from(
    new Set(
      names
        .map((n) => n.trim().toLowerCase())
        .filter((n) => n.length > 0),
    ),
  );
  if (unique.length === 0) return [];
  const rows = await Promise.all(
    unique.map((name) =>
      prisma.genre.upsert({
        where: { name },
        create: { name },
        update: {},
        select: { id: true, name: true },
      }),
    ),
  );
  return rows;
}
