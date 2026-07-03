import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getMovieFranchiseMemberships } from "@/lib/movies/movie-franchise-memberships";
import {
  parsePlacementTarget,
  placeMovieInFranchise,
  releaseMovieFromFranchise,
} from "@/lib/franchises/franchise-slot-placement";
import {
  isErrorResponse,
  jsonError,
  parseMovieFranchiseIds,
  type MovieFranchiseRouteContext,
} from "@/lib/api/api-utils";

export async function PATCH(
  request: NextRequest,
  context: MovieFranchiseRouteContext,
) {
  const ids = await parseMovieFranchiseIds(context.params);
  if (isErrorResponse(ids)) return ids;

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
  context: MovieFranchiseRouteContext,
) {
  const ids = await parseMovieFranchiseIds(context.params);
  if (isErrorResponse(ids)) return ids;

  await releaseMovieFromFranchise(prisma, {
    movieId: ids.movieId,
    franchiseId: ids.franchiseId,
  });

  const memberships = await getMovieFranchiseMemberships(prisma, ids.movieId);
  return NextResponse.json(memberships);
}
