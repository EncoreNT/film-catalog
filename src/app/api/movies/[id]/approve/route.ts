import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { MovieStatus } from "@/generated/prisma/client";
import { movieInclude } from "@/lib/movie-include";
import {
  isErrorResponse,
  parseRouteId,
  type RouteContext,
} from "@/lib/api-utils";

export async function POST(_request: NextRequest, context: RouteContext) {
  const movieId = await parseRouteId(context.params);
  if (isErrorResponse(movieId)) return movieId;

  const movie = await prisma.movie.update({
    where: { id: movieId },
    data: { status: MovieStatus.CATALOG },
    include: movieInclude,
  });

  return NextResponse.json(movie);
}
