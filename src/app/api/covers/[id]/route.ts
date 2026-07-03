import { NextRequest } from "next/server";
import { prisma } from "@/lib/db/prisma";
import {
  isErrorResponse,
  jsonError,
  parseRouteId,
  type RouteContext,
} from "@/lib/api/api-utils";
import { serveCoverFile } from "@/lib/covers/serve-cover";

export async function GET(request: NextRequest, context: RouteContext) {
  const movieId = await parseRouteId(context.params);
  if (isErrorResponse(movieId)) return movieId;

  const movie = await prisma.movie.findUnique({
    where: { id: movieId },
    select: { coverPath: true, updatedAt: true },
  });
  if (!movie?.coverPath) {
    return jsonError("Обложка не найдена", 404);
  }

  return serveCoverFile(request, {
    entityId: movieId,
    updatedAt: movie.updatedAt,
    relativeCoverPath: movie.coverPath,
    etagPrefix: "cover",
    validateExtension: true,
    onInvalidExtension: async () => {
      await prisma.movie.update({
        where: { id: movieId },
        data: { coverPath: null },
      });
    },
    onMissingFile: async () => {
      await prisma.movie.update({
        where: { id: movieId },
        data: { coverPath: null },
      });
    },
  });
}
