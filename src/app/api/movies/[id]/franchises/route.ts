import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveFranchiseSlug } from "@/lib/franchise-slug";
import { getMovieFranchiseMemberships } from "@/lib/movie-franchise-memberships";
import {
  parsePlacementTarget,
  placeMovieInFranchise,
} from "@/lib/franchise-slot-placement";
import {
  isErrorResponse,
  jsonError,
  parseRouteId,
  type RouteContext,
} from "@/lib/api-utils";

export async function GET(_request: NextRequest, context: RouteContext) {
  const movieId = await parseRouteId(context.params);
  if (isErrorResponse(movieId)) return movieId;

  const memberships = await getMovieFranchiseMemberships(prisma, movieId);
  return NextResponse.json(memberships);
}

export async function POST(request: NextRequest, context: RouteContext) {
  const movieId = await parseRouteId(context.params);
  if (isErrorResponse(movieId)) return movieId;

  const body = (await request.json().catch(() => null)) as
    | { franchiseId?: unknown; name?: unknown; target?: unknown }
    | null;

  const name =
    typeof body?.name === "string" ? body.name.trim() : "";
  const franchiseId =
    typeof body?.franchiseId === "number" && Number.isInteger(body.franchiseId)
      ? body.franchiseId
      : null;

  if (!name && franchiseId == null) {
    return jsonError("Укажите franchiseId или name", 400);
  }

  const target = parsePlacementTarget(body?.target);

  try {
    const memberships = await prisma.$transaction(async (tx) => {
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

      // A freshly created franchise has no slots, so only "end" makes sense;
      // placeMovieInFranchise handles that naturally.
      await placeMovieInFranchise(tx, {
        movieId,
        franchiseId: targetFranchiseId,
        target: name ? { kind: "end" } : target,
      });

      return getMovieFranchiseMemberships(tx, movieId);
    });

    return NextResponse.json(memberships);
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Не удалось добавить франшизу";
    return jsonError(message, 400);
  }
}
