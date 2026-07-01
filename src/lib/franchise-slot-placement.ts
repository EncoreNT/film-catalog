import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";

type DbClient = Prisma.TransactionClient | typeof prisma;

export type SlotPlacementTarget =
  | { kind: "end" }
  | { kind: "before"; slotId: number }
  | { kind: "fill"; slotId: number };

interface PlaceArgs {
  movieId: number;
  franchiseId: number;
  target: SlotPlacementTarget;
}

/**
 * Places (or moves) a movie within a franchise's ordered slot list, then
 * renumbers every slot so `storyOrder` stays a contiguous 0..N-1 sequence.
 *
 * - `end`: append a new slot for the movie.
 * - `before`: insert a new slot immediately before the referenced slot.
 * - `fill`: occupy an existing empty placeholder slot (no new slot created).
 *
 * If the movie already occupies a slot in this franchise, that slot is removed
 * first (a move), so the `@@unique([franchiseId, movieId])` constraint holds.
 */
export async function placeMovieInFranchise(
  db: DbClient,
  { movieId, franchiseId, target }: PlaceArgs,
): Promise<void> {
  const slots = await db.franchiseSlot.findMany({
    where: { franchiseId },
    orderBy: { storyOrder: "asc" },
    select: { id: true, storyOrder: true, movieId: true },
  });

  const ownIndex = slots.findIndex((s) => s.movieId === movieId);
  let working = slots;
  if (ownIndex >= 0) {
    await db.franchiseSlot.delete({ where: { id: slots[ownIndex].id } });
    working = slots.filter((_, i) => i !== ownIndex);
  }

  type Entry = { slotId: number; movieId: number | null };
  const finalOrder: Entry[] = working.map((s) => ({
    slotId: s.id,
    movieId: s.movieId,
  }));

  if (target.kind === "end") {
    const created = await db.franchiseSlot.create({
      data: { franchiseId, movieId, storyOrder: working.length },
    });
    finalOrder.push({ slotId: created.id, movieId });
  } else if (target.kind === "before") {
    const idx = working.findIndex((s) => s.id === target.slotId);
    if (idx < 0) throw new Error("Слот не найден");
    const created = await db.franchiseSlot.create({
      data: { franchiseId, movieId, storyOrder: idx },
    });
    finalOrder.splice(idx, 0, { slotId: created.id, movieId });
  } else {
    const targetSlot = working.find((s) => s.id === target.slotId);
    if (!targetSlot) throw new Error("Слот не найден");
    if (targetSlot.movieId != null) throw new Error("Слот уже занят");
    await db.franchiseSlot.update({
      where: { id: target.slotId },
      data: { movieId },
    });
    const idx = working.findIndex((s) => s.id === target.slotId);
    finalOrder[idx] = { slotId: target.slotId, movieId };
  }

  for (let i = 0; i < finalOrder.length; i++) {
    await db.franchiseSlot.update({
      where: { id: finalOrder[i].slotId },
      data: { storyOrder: i },
    });
  }
}

/** Frees the slot occupied by a movie without removing the slot itself. */
export async function releaseMovieFromFranchise(
  db: DbClient,
  { movieId, franchiseId }: { movieId: number; franchiseId: number },
): Promise<void> {
  await db.franchiseSlot.updateMany({
    where: { franchiseId, movieId },
    data: { movieId: null },
  });
}

export function parsePlacementTarget(raw: unknown): SlotPlacementTarget {
  if (typeof raw !== "object" || raw === null) return { kind: "end" };
  const t = raw as { kind?: unknown; slotId?: unknown };
  if (t.kind === "before" && typeof t.slotId === "number") {
    return { kind: "before", slotId: t.slotId };
  }
  if (t.kind === "fill" && typeof t.slotId === "number") {
    return { kind: "fill", slotId: t.slotId };
  }
  return { kind: "end" };
}
