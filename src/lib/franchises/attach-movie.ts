import type { PrismaClient } from "@/generated/prisma/client";
import { prisma } from "@/lib/db/prisma";
import { resolveFranchiseSlug } from "@/lib/franchises/franchise-slug";
import { getMovieFranchiseMemberships } from "@/lib/movies/movie-franchise-memberships";
import {
  parsePlacementTarget,
  placeMovieInFranchise,
} from "@/lib/franchises/franchise-slot-placement";
import type { movieFranchiseAttachSchema } from "@/lib/api/validators";
import type { z } from "zod";

type AttachInput = z.infer<typeof movieFranchiseAttachSchema>;
type FranchiseDb = Pick<
  PrismaClient,
  "franchise" | "$transaction"
>;

export async function attachMovieToFranchise(
  movieId: number,
  input: AttachInput,
  db: FranchiseDb = prisma,
) {
  const name = input.name?.trim() ?? "";
  const franchiseId = input.franchiseId ?? null;
  const target = parsePlacementTarget(input.target);

  return db.$transaction(async (tx) => {
    let targetFranchiseId: number;

    if (name) {
      const slug = await resolveFranchiseSlug(tx, name);
      const created = await tx.franchise.create({
        data: { slug, name },
      });
      targetFranchiseId = created.id;
    } else {
      targetFranchiseId = franchiseId as number;
      const existing = await tx.franchise.findUnique({
        where: { id: targetFranchiseId },
        select: { id: true },
      });
      if (!existing) throw new Error("Франшиза не найдена");
    }

    await placeMovieInFranchise(tx, {
      movieId,
      franchiseId: targetFranchiseId,
      target: name ? { kind: "end" } : target,
    });

    return getMovieFranchiseMemberships(tx, movieId);
  });
}
