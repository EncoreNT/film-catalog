import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import {
  isErrorResponse,
  jsonError,
  parseRouteId,
  type RouteContext,
} from "@/lib/api/api-utils";
import {
  isCoverUploadError,
  parseCoverUploadRequest,
} from "@/lib/covers/parse-cover-upload";
import { saveMovieCover } from "@/lib/covers/save-movie-cover";

export async function POST(request: NextRequest, context: RouteContext) {
  const movieId = await parseRouteId(context.params);
  if (isErrorResponse(movieId)) return movieId;

  const movie = await prisma.movie.findUnique({ where: { id: movieId } });
  if (!movie) {
    return jsonError("Фильм не найден", 404);
  }

  try {
    const payload = await parseCoverUploadRequest(request);
    if (isCoverUploadError(payload)) {
      return jsonError(payload.message, payload.status);
    }
    const updated = await saveMovieCover(
      prisma,
      movieId,
      payload.buffer,
      payload.ext,
    );
    return NextResponse.json(updated);
  } catch {
    return jsonError("Не удалось сохранить обложку", 500);
  }
}
