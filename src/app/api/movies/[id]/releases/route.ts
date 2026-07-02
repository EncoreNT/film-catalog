import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { releaseCreateSchema } from "@/lib/validators";
import { releaseInclude } from "@/lib/movie-include";
import { maybeExtractCover } from "@/lib/cover-storage";
import { createReleaseWithTracks } from "@/lib/release-api";
import {
  isErrorResponse,
  jsonError,
  parseRouteId,
  type RouteContext,
} from "@/lib/api-utils";

export async function GET(_request: NextRequest, context: RouteContext) {
  const movieId = await parseRouteId(context.params);
  if (isErrorResponse(movieId)) return movieId;

  const releases = await prisma.release.findMany({
    where: { movieId },
    include: releaseInclude,
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json({ releases });
}

export async function POST(request: NextRequest, context: RouteContext) {
  const movieId = await parseRouteId(context.params);
  if (isErrorResponse(movieId)) return movieId;

  try {
    const body = await request.json();
    const data = releaseCreateSchema.parse(body);

    const movie = await prisma.movie.findUnique({
      where: { id: movieId },
      select: { id: true, coverPath: true },
    });
    if (!movie) return jsonError("Фильм не найден", 404);

    const release = await prisma.$transaction(async (tx) => {
      const created = await createReleaseWithTracks(tx, movieId, data);
      return tx.release.findUnique({
        where: { id: created.id },
        include: releaseInclude,
      });
    });

    const trimmedPath = data.filePath?.trim();
    if (trimmedPath && !movie.coverPath) {
      try {
        await maybeExtractCover(movieId, trimmedPath, false);
      } catch {
        // non-fatal
      }
    }

    return NextResponse.json(release, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Не удалось создать релиз";
    return jsonError(message, 400);
  }
}
