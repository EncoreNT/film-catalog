import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getMovieFranchiseMemberships } from "@/lib/movie-franchise-memberships";
import {
  parsePlacementTarget,
  placeMovieInFranchise,
  releaseMovieFromFranchise,
} from "@/lib/franchise-slot-placement";
import { jsonError } from "@/lib/api-utils";

interface FranchiseRouteContext {
  params: Promise<{ id: string; franchiseId: string }>;
}

function parseIds(params: { id: string; franchiseId: string }) {
  const movieId = parseInt(params.id, 10);
  const franchiseId = parseInt(params.franchiseId, 10);
  if (Number.isNaN(movieId) || Number.isNaN(franchiseId)) {
    return null;
  }
  return { movieId, franchiseId };
}

export async function PATCH(
  request: NextRequest,
  context: FranchiseRouteContext,
) {
  const ids = parseIds(await context.params);
  if (!ids) return jsonError("Некорректный идентификатор", 400);

  const body = (await request.json().catch(() => null)) as
    | { target?: unknown }
    | null;
  const target = parsePlacementTarget(body?.target);

  try {
    const memberships = await prisma.$transaction(async (tx) => {
      const existing = await tx.franchise.findUnique({
        where: { id: ids.franchiseId },
        select: { id: true },
      });
      if (!existing) throw new Error("Франшиза не найдена");

      await placeMovieInFranchise(tx, {
        movieId: ids.movieId,
        franchiseId: ids.franchiseId,
        target,
      });

      return getMovieFranchiseMemberships(tx, ids.movieId);
    });

    return NextResponse.json(memberships);
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Не удалось переместить фильм";
    return jsonError(message, 400);
  }
}

export async function DELETE(
  _request: NextRequest,
  context: FranchiseRouteContext,
) {
  const ids = parseIds(await context.params);
  if (!ids) return jsonError("Некорректный идентификатор", 400);

  await releaseMovieFromFranchise(prisma, {
    movieId: ids.movieId,
    franchiseId: ids.franchiseId,
  });

  const memberships = await getMovieFranchiseMemberships(prisma, ids.movieId);
  return NextResponse.json(memberships);
}
