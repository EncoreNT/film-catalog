import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { releaseCreateSchema } from "@/lib/api/validators";
import { releaseInclude } from "@/lib/movies/movie-include";
import type { ReleaseWithTracks } from "@/lib/movies/movie-include";
import { sortReleasesByQuality } from "@/lib/releases/release-primary";
import { createRelease } from "@/lib/releases/create-release";
import {
  isErrorResponse,
  mapDomainError,
  parseRequestBody,
  parseRouteId,
  type RouteContext,
} from "@/lib/api/api-utils";

export async function GET(_request: NextRequest, context: RouteContext) {
  const movieId = await parseRouteId(context.params);
  if (isErrorResponse(movieId)) return movieId;

  const releases = sortReleasesByQuality(
    (await prisma.release.findMany({
      where: { movieId },
      include: releaseInclude,
    })) as ReleaseWithTracks[],
  );

  return NextResponse.json({ releases });
}

export async function POST(request: NextRequest, context: RouteContext) {
  const movieId = await parseRouteId(context.params);
  if (isErrorResponse(movieId)) return movieId;

  const data = await parseRequestBody(request, releaseCreateSchema);
  if (isErrorResponse(data)) return data;

  try {
    const release = await createRelease(movieId, data);
    return NextResponse.json(release, { status: 201 });
  } catch (err) {
    return mapDomainError(err, "Не удалось создать релиз");
  }
}
